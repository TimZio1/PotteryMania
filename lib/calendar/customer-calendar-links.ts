import type { BookingIcsRow } from "@/lib/calendar/booking-ics";
import { bookingSlotUtcRangeInTimezone } from "@/lib/calendar/booking-slot-times";
import { resolveStudioIanaTimezone } from "@/lib/calendar/booking-timezone";
import { escapeHtml } from "@/lib/email/base";

function toGoogleUtcParam(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/**
 * Google Calendar “template” deep link (UTC instants in `dates`).
 */
export function buildGoogleCalendarAddUrl(row: BookingIcsRow, opts?: { details?: string; location?: string }): string {
  const tz = resolveStudioIanaTimezone(row.studio);
  const { start, end } = bookingSlotUtcRangeInTimezone(
    row.slot,
    Math.max(1, row.experience.durationMinutes || 60),
    tz,
  );
  const dates = `${toGoogleUtcParam(start)}/${toGoogleUtcParam(end)}`;
  const text = `${row.experience.title} — ${row.studio.displayName}`;
  const details =
    opts?.details ??
    [
      `Studio: ${row.studio.displayName}`,
      row.ticketRef ? `Reference: ${row.ticketRef}` : null,
      `Participants: ${row.participantCount}`,
    ]
      .filter(Boolean)
      .join("\\n");
  const location = opts?.location ?? buildLocationLine(row);
  const u = new URL("https://calendar.google.com/calendar/render");
  u.searchParams.set("action", "TEMPLATE");
  u.searchParams.set("text", text);
  u.searchParams.set("dates", dates);
  u.searchParams.set("details", details);
  if (location) u.searchParams.set("location", location);
  return u.toString();
}

function buildLocationLine(row: BookingIcsRow): string {
  const bits: string[] = [];
  if (row.experience.venueName) bits.push(row.experience.venueName);
  const line = row.experience.addressLine1 || row.studio.addressLine1;
  if (line) bits.push(line);
  const city = row.experience.city || row.studio.city;
  const country = row.experience.country || row.studio.country;
  if (city || country) bits.push([city, country].filter(Boolean).join(", "));
  return bits.join(", ");
}

/**
 * Outlook on the web “deeplink” compose (ISO start/end).
 */
export function buildOutlookWebCalendarUrl(row: BookingIcsRow): string {
  const tz = resolveStudioIanaTimezone(row.studio);
  const { start, end } = bookingSlotUtcRangeInTimezone(
    row.slot,
    Math.max(1, row.experience.durationMinutes || 60),
    tz,
  );
  const subject = `${row.experience.title} — ${row.studio.displayName}`;
  const body = [
    `Studio: ${row.studio.displayName}`,
    row.ticketRef ? `Reference: ${row.ticketRef}` : null,
    `Participants: ${row.participantCount}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const location = buildLocationLine(row);
  const u = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
  u.searchParams.set("path", "/calendar/action/compose");
  u.searchParams.set("rru", "addevent");
  u.searchParams.set("subject", subject);
  u.searchParams.set("body", body);
  u.searchParams.set("startdt", start.toISOString());
  u.searchParams.set("enddt", end.toISOString());
  if (location) u.searchParams.set("location", location);
  return u.toString();
}

/** Rich HTML block for confirmation emails (links only; ICS is attached separately when available). */
export function buildCustomerCalendarEmailSection(input: {
  googleUrl: string;
  outlookUrl: string;
  guestIcsUrl: string | null;
}): string {
  const rows: string[] = [
    `<p style="margin:0 0 12px;font-weight:600;">Add to your calendar</p>`,
    `<p style="margin:0 0 10px;"><a href="${escapeHtml(input.googleUrl)}" style="color:#7a553f;font-weight:600;">Google Calendar</a></p>`,
    `<p style="margin:0 0 10px;"><a href="${escapeHtml(input.outlookUrl)}" style="color:#7a553f;font-weight:600;">Outlook.com (personal)</a> — opens Outlook on the web; work/school accounts may need manual import via .ics.</p>`,
  ];
  if (input.guestIcsUrl) {
    rows.push(
      `<p style="margin:0 0 10px;"><a href="${escapeHtml(input.guestIcsUrl)}" style="color:#7a553f;font-weight:600;">Download .ics</a> (Apple Calendar and other apps)</p>`,
    );
  }
  rows.push(
    `<p style="margin:0;font-size:13px;color:#6b5d52;">Apple Calendar: use the .ics download, or subscribe to all bookings from your PotteryMania account.</p>`,
  );
  return `<div style="margin-top:20px;padding:18px;border-radius:16px;background:#f6f1ea;border:1px solid rgba(79,52,37,0.12);">${rows.join("")}</div>`;
}

export function appendCalendarSectionToEmailHtml(html: string, sectionHtml: string): string {
  if (!sectionHtml) return html;
  return html.replace("</body>", `${sectionHtml}</body>`);
}
