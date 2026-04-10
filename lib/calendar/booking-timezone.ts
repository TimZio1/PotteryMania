/**
 * Slot dates are stored as calendar days (`@db.Date`); start/end are wall-clock strings.
 * Google Calendar expects `dateTime` + `timeZone` when the wall time is in a specific IANA zone.
 */

/** IANA zones: letters, slashes (e.g. America/Argentina/Buenos_Aires), underscores, digits, etc. */
const SAFE_TZ = /^[A-Za-z0-9_/+\-.]+$/;

export function defaultBookingIanaTimezone(): string {
  const fromEnv = process.env.DEFAULT_BOOKING_IANA_TIMEZONE?.trim();
  if (fromEnv && SAFE_TZ.test(fromEnv)) return fromEnv;
  return "Europe/Paris";
}

export function resolveStudioIanaTimezone(studio: { ianaTimezone?: string | null } | null | undefined): string {
  const t = studio?.ianaTimezone?.trim();
  if (t && SAFE_TZ.test(t)) return t;
  return defaultBookingIanaTimezone();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `HH:mm` or `HH:mm:ss` from slot row. */
export function normalizeSlotClock(t: string): string {
  const p = t.trim();
  if (/^\d{2}:\d{2}$/.test(p)) return p;
  if (/^\d{2}:\d{2}:\d{2}$/.test(p)) return p.slice(0, 5);
  return "10:00";
}

/**
 * Calendar day from Prisma `@db.Date` + wall time in `timeZone` for Google Calendar API.
 */
export function bookingSlotToGoogleDateTime(
  slotDate: Date,
  clockHHMM: string,
  timeZone: string,
): { dateTime: string; timeZone: string } {
  const y = slotDate.getUTCFullYear();
  const m = pad2(slotDate.getUTCMonth() + 1);
  const d = pad2(slotDate.getUTCDate());
  const time = normalizeSlotClock(clockHHMM);
  return {
    dateTime: `${y}-${m}-${d}T${time}:00`,
    timeZone,
  };
}
