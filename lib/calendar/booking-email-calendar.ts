import { buildBookingsIcsCalendar } from "@/lib/calendar/booking-ics";
import {
  appendCalendarSectionToEmailHtml,
  buildCustomerCalendarEmailSection,
  buildGoogleCalendarAddUrl,
  buildOutlookWebCalendarUrl,
} from "@/lib/calendar/customer-calendar-links";
import { createBookingCalendarGuestQuery, guestCalendarLinksConfigured } from "@/lib/calendar/booking-calendar-guest";
import { loadBookingIcsRowById } from "@/lib/calendar/load-booking-ics-rows";

function publicOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    process.env.AUTH_URL?.replace(/\/+$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

export type BookingCalendarEmailPayload = {
  customerHtmlWithCalendar: string;
  customerAttachments: { filename: string; content: string }[];
};

/**
 * Enrich customer confirmation HTML with add-to-calendar links + optional ICS attachment.
 * Returns unchanged HTML when row missing or booking not suitable.
 */
export async function enrichCustomerEmailWithCalendar(
  bookingId: string,
  customerHtml: string,
): Promise<BookingCalendarEmailPayload> {
  const row = await loadBookingIcsRowById(bookingId);
  if (!row) {
    return { customerHtmlWithCalendar: customerHtml, customerAttachments: [] };
  }

  const googleUrl = buildGoogleCalendarAddUrl(row);
  const outlookUrl = buildOutlookWebCalendarUrl(row);

  let guestIcsUrl: string | null = null;
  if (guestCalendarLinksConfigured()) {
    const { exp, sig } = createBookingCalendarGuestQuery(bookingId);
    if (sig) {
      const u = new URL(publicOrigin());
      u.pathname = `/api/bookings/${bookingId}/calendar/guest`;
      u.searchParams.set("exp", String(exp));
      u.searchParams.set("sig", sig);
      guestIcsUrl = u.toString();
    }
  }

  const section = buildCustomerCalendarEmailSection({ googleUrl, outlookUrl, guestIcsUrl });
  const withSection = appendCalendarSectionToEmailHtml(customerHtml, section);

  const icsBody = buildBookingsIcsCalendar([row], "PotteryMania booking");
  const customerAttachments = [
    {
      filename: `potterymania-booking-${bookingId.slice(0, 8)}.ics`,
      content: Buffer.from(icsBody, "utf8").toString("base64"),
    },
  ];

  return { customerHtmlWithCalendar: withSection, customerAttachments };
}
