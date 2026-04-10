import { formatInTimeZone, toDate } from "date-fns-tz";
import { normalizeSlotClock } from "@/lib/calendar/booking-timezone";

/**
 * Single source of truth: slot calendar day (UTC date parts from `@db.Date`) + wall-clock
 * in `timeZone` → absolute instants. Matches Google Calendar semantics used by the API.
 */
export function bookingSlotUtcRangeInTimezone(
  slot: { slotDate: Date; startTime: string; endTime: string },
  durationFallbackMinutes: number,
  timeZone: string,
): { start: Date; end: Date } {
  const y = slot.slotDate.getUTCFullYear();
  const m = String(slot.slotDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(slot.slotDate.getUTCDate()).padStart(2, "0");
  const startClock = normalizeSlotClock(slot.startTime);
  const endClock = normalizeSlotClock(slot.endTime);
  const start = toDate(`${y}-${m}-${d}T${startClock}:00`, { timeZone });
  let end = toDate(`${y}-${m}-${d}T${endClock}:00`, { timeZone });
  if (end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + Math.max(1, durationFallbackMinutes) * 60_000);
  }
  return { start, end };
}

/** Same wall times as `bookingSlotUtcRangeInTimezone`, formatted for Calendar API `dateTime` + `timeZone`. */
export function bookingSlotGoogleDateTimes(
  slot: { slotDate: Date; startTime: string; endTime: string },
  durationFallbackMinutes: number,
  timeZone: string,
): { start: { dateTime: string; timeZone: string }; end: { dateTime: string; timeZone: string } } {
  const { start, end } = bookingSlotUtcRangeInTimezone(slot, durationFallbackMinutes, timeZone);
  const pattern = "yyyy-MM-dd'T'HH:mm:ss";
  return {
    start: { dateTime: formatInTimeZone(start, timeZone, pattern), timeZone },
    end: { dateTime: formatInTimeZone(end, timeZone, pattern), timeZone },
  };
}
