/**
 * Production guard: fail fast if calendar-related DB columns are missing (migrations not applied).
 * If the DB is temporarily unreachable during boot, don't crash the whole server; request paths
 * already handle transient DB outages more gracefully than startup instrumentation does.
 * Set SKIP_CALENDAR_SCHEMA_GUARD=1 to bypass completely (e.g. CI image build without DB).
 */

function isNextBuildPhase(): boolean {
  if (process.env.npm_lifecycle_event === "build") return true;
  const phase = process.env.NEXT_PHASE;
  return phase === "phase-production-build" || phase === "phase-export";
}

function isDatabaseConnectivityFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /can't reach database server|too many clients|econnrefused|econnreset|etimedout|p1001|connection terminated/i.test(message);
}

export async function register() {
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
