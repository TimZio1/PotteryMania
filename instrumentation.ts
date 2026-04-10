/**
 * Production guard: fail fast if calendar-related DB columns are missing (migrations not applied).
 * Set SKIP_CALENDAR_SCHEMA_GUARD=1 to bypass (e.g. CI image build without DB).
 */
function isNextBuildPhase(): boolean {
  if (process.env.npm_lifecycle_event === "build") return true;
  const phase = process.env.NEXT_PHASE;
  return phase === "phase-production-build" || phase === "phase-export";
}

export async function register() {
  if (isNextBuildPhase()) return;
  if (process.env.SKIP_CALENDAR_SCHEMA_GUARD === "1") return;
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.DATABASE_URL?.trim()) return;

  const { prisma } = await import("@/lib/db");
  const { assertCalendarDatabaseSchemaOrThrow } = await import("@/lib/calendar/calendar-deployment-guards");
  try {
    await assertCalendarDatabaseSchemaOrThrow(prisma);
  } catch (e) {
    console.error("[instrumentation] calendar schema guard failed", e);
    throw e;
  }
}
