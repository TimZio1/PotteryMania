import type { BookingStatus } from "@prisma/client";

function publicSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    process.env.AUTH_URL?.replace(/\/+$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

function icsHostForUid(): string {
  try {
    return new URL(publicSiteOrigin()).host || "potterymania.local";
  } catch {
    return "potterymania.local";
  }
}

function parseClockParts(t: string | undefined): { h: number; m: number } {
  if (!t || typeof t !== "string") return { h: 0, m: 0 };
  const [a, b] = t.split(":");
  const h = Number(a);
  const m = Number(b ?? 0);
  return {
    h: Number.isFinite(h) ? h : 0,
    m: Number.isFinite(m) ? m : 0,
  };
}

/** Same wall-clock interpretation as `lib/bookings/cancel.ts` (local `setHours` on slot date). */
export function bookingSlotLocalRange(
  slot: { slotDate: Date; startTime: string; endTime: string },
  durationFallbackMinutes: number,
): { start: Date; end: Date } {
  const start = new Date(slot.slotDate);
  const sh = parseClockParts(slot.startTime);
  start.setHours(sh.h || 0, sh.m || 0, 0, 0);

  const end = new Date(slot.slotDate);
  const eh = parseClockParts(slot.endTime);
  end.setHours(eh.h || 0, eh.m || 0, 0, 0);

  if (end.getTime() <= start.getTime()) {
    end.setTime(start.getTime() + Math.max(1, durationFallbackMinutes) * 60_000);
  }
  return { start, end };
}

function formatIcsUtc(dt: Date): string {
  return dt
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

/** RFC 5545 line folding (75 octets is ideal; we use 75 chars for Latin-heavy fields). */
function foldIcsLine(line: string): string {
  const max = 75;
  if (line.length <= max) return line;
  const parts: string[] = [line.slice(0, max)];
  let rest = line.slice(max);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, max - 1)}`);
    rest = rest.slice(max - 1);
  }
  return parts.join("\r\n");
}

function icsStatus(bookingStatus: BookingStatus): "CONFIRMED" | "TENTATIVE" | "CANCELLED" {
  switch (bookingStatus) {
    case "cancelled_by_customer":
    case "cancelled_by_vendor":
    case "cancelled_by_admin":
    case "refunded":
      return "CANCELLED";
    case "pending":
    case "awaiting_vendor_approval":
    case "cancellation_requested":
      return "TENTATIVE";
    default:
      return "CONFIRMED";
  }
}

export type BookingIcsRow = {
  id: string;
  bookingStatus: BookingStatus;
  participantCount: number;
  ticketRef: string | null;
  customerName: string;
  experience: {
    title: string;
    durationMinutes: number;
    venueName: string | null;
    addressLine1: string | null;
    city: string | null;
    country: string | null;
  };
  studio: {
    displayName: string;
    addressLine1: string;
    city: string;
    country: string;
  };
  slot: {
    slotDate: Date;
    startTime: string;
    endTime: string;
  };
};

function buildLocation(row: BookingIcsRow): string {
  const bits: string[] = [];
  if (row.experience.venueName) bits.push(row.experience.venueName);
  const line = row.experience.addressLine1 || row.studio.addressLine1;
  if (line) bits.push(line);
  const city = row.experience.city || row.studio.city;
  const country = row.experience.country || row.studio.country;
  if (city || country) bits.push([city, country].filter(Boolean).join(", "));
  return bits.join(", ");
}

function buildDescription(row: BookingIcsRow): string {
  const lines = [
    `Studio: ${row.studio.displayName}`,
    `Participants: ${row.participantCount}`,
    row.ticketRef ? `Reference: ${row.ticketRef}` : null,
    row.customerName ? `Booked as: ${row.customerName}` : null,
  ].filter(Boolean) as string[];
  return lines.join("\\n");
}

function veventForBooking(row: BookingIcsRow): string {
  const { start, end } = bookingSlotLocalRange(row.slot, row.experience.durationMinutes);
  const host = icsHostForUid();
  const uid = `pm-booking-${row.id}@${host}`;
  const status = icsStatus(row.bookingStatus);
  const summary = `${row.experience.title} — ${row.studio.displayName}`;
  const url = `${publicSiteOrigin()}/my-bookings`;

  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    foldIcsLine(`SUMMARY:${escapeIcsText(summary)}`),
    foldIcsLine(`DESCRIPTION:${escapeIcsText(buildDescription(row))}`),
    foldIcsLine(`LOCATION:${escapeIcsText(buildLocation(row))}`),
    `URL:${url}`,
    `STATUS:${status}`,
    "END:VEVENT",
  ];
  return lines.join("\r\n");
}

/** RFC 5545 iCalendar with one or more VEVENTs (UTF-8). */
export function buildBookingsIcsCalendar(rows: BookingIcsRow[], calName: string): string {
  const head = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PotteryMania//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldIcsLine(`X-WR-CALNAME:${escapeIcsText(calName)}`),
    ...rows.map((r) => veventForBooking(r)),
    "END:VCALENDAR",
  ];
  return head.join("\r\n");
}
