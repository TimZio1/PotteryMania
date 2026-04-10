/**
 * Next.js instrumentation entry point.
 *
 * Responsibilities:
 * 1. Initialize Sentry for both Node.js and Edge runtimes (@sentry/nextjs requires
 *    this hook; without it the SDK is not properly set up and may interfere with
 *    response handling, causing "Cannot append headers after they are sent" errors).
 * 2. Production guard: fail fast if calendar-related DB columns are missing
 *    (migrations not applied). Only runs on Node.js runtime.
 *
 * Set SKIP_CALENDAR_SCHEMA_GUARD=1 to bypass the DB schema check (e.g. CI builds
 * without a database). If the DB is temporarily unreachable during boot, the guard
 * is skipped gracefully — request paths handle transient DB outages better than
 * startup instrumentation does.
 */

function isNextBuildPhase(): boolean {
  if (process.env.npm_lifecycle_event === "build") return true;
  const phase = process.env.NEXT_PHASE;
  return phase === "phase-production-build" || phase === "phase-export";
}

function isDatabaseConnectivityFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /can't reach database server|econnrefused|econnreset|etimedout|p1001|connection terminated/i.test(message);
}

export async function register() {
  // Initialize Sentry for the appropriate runtime. @sentry/nextjs expects to be
  // bootstrapped here so it can instrument fetch, headers, and response handling
  // before any request is processed. Skipping this causes header-mutation errors
  // because the SDK's uninitialised state interferes with Next.js internals.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@sentry/nextjs").then((Sentry) => {
      if (process.env.SENTRY_DSN) {
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          tracesSampleRate: 0.2,
          enabled: process.env.NODE_ENV === "production",
        });
      }
    });
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("@sentry/nextjs").then((Sentry) => {
      if (process.env.SENTRY_DSN) {
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          tracesSampleRate: 0.2,
          enabled: process.env.NODE_ENV === "production",
        });
      }
    });
  }

  // Calendar schema guard — Node.js only, production only.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (isNextBuildPhase()) return;
  if (process.env.SKIP_CALENDAR_SCHEMA_GUARD === "1") return;
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.DATABASE_URL?.trim()) return;

  const { prisma } = await import("@/lib/db");
  const { assertCalendarDatabaseSchemaOrThrow } = await import("@/lib/calendar/calendar-deployment-guards");
  try {
    await assertCalendarDatabaseSchemaOrThrow(prisma);
  } catch (e) {
    if (isDatabaseConnectivityFailure(e)) {
      console.warn("[instrumentation] calendar schema guard skipped due to database connectivity", e);
      return;
    }
    console.error("[instrumentation] calendar schema guard failed", e);
    throw e;
  }
}
