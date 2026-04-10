import type { PrismaClient } from "@prisma/client";

const REQUIRED_CALENDAR_MIGRATIONS = [
  "20250402120000_init — calendar_connections, calendar_sync_logs",
  "20260403170000_domination_roadmap — calendar_connections OAuth token columns",
  "20260415100000_booking_google_calendar_event_id — bookings.google_calendar_event_id",
  "20260424120000_calendar_integration_enhancements — studios.iana_timezone, bookings sync columns",
] as const;

/**
 * Throws if expected calendar columns are missing (usually means `prisma migrate deploy` was not run).
 * Call from instrumentation on server boot in production.
 */
export async function assertCalendarDatabaseSchemaOrThrow(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.$queryRaw<{ c: bigint }[]>`
    SELECT COUNT(*)::bigint AS c
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name IN ('google_calendar_event_id', 'google_calendar_synced_at', 'google_calendar_last_error')
  `;
  const n = Number(rows[0]?.c ?? 0);
  if (n < 3) {
    throw new Error(
      `[calendar schema] Expected 3 booking calendar columns on public.bookings, found ${n}. ` +
        `Run migrations in order: ${REQUIRED_CALENDAR_MIGRATIONS.join("; ")}`,
    );
  }

  const studioTz = await prisma.$queryRaw<{ c: bigint }[]>`
    SELECT COUNT(*)::bigint AS c
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'studios'
      AND column_name = 'iana_timezone'
  `;
  if (Number(studioTz[0]?.c ?? 0) < 1) {
    throw new Error(
      "[calendar schema] Missing public.studios.iana_timezone. Apply migration 20260424120000_calendar_integration_enhancements.",
    );
  }

  const tokens = await prisma.$queryRaw<{ c: bigint }[]>`
    SELECT COUNT(*)::bigint AS c
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendar_connections'
      AND column_name IN ('access_token', 'refresh_token', 'token_expires_at')
  `;
  if (Number(tokens[0]?.c ?? 0) < 3) {
    throw new Error(
      "[calendar schema] Missing OAuth token columns on calendar_connections. Apply migration 20260403170000_domination_roadmap.",
    );
  }
}

export function calendarMigrationsRequiredForDocs(): readonly string[] {
  return REQUIRED_CALENDAR_MIGRATIONS;
}
