-- Studio IANA timezone for calendar wall times (Google + ICS semantics).
ALTER TABLE "studios" ADD COLUMN "iana_timezone" TEXT;

-- Per-booking studio calendar sync bookkeeping (denormalized for dashboards / emails).
ALTER TABLE "bookings" ADD COLUMN "google_calendar_synced_at" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "google_calendar_last_error" VARCHAR(500);
