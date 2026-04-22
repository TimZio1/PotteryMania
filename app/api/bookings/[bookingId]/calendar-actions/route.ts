import { NextResponse } from "next/server";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { buildGoogleCalendarAddUrl, buildOutlookWebCalendarUrl } from "@/lib/calendar/customer-calendar-links";
import {
  createBookingCalendarGuestQuery,
  guestCalendarLinksConfigured,
} from "@/lib/calendar/booking-calendar-guest";
import { loadBookingIcsRowById } from "@/lib/calendar/load-booking-ics-rows";
import { resolveFrontdeskSiteUrl } from "@/lib/public-site-url";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ bookingId: string }> };

/**
 * Add-to-calendar links for authenticated customers, studio owners, and admins.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { bookingId } = await ctx.params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { customerUserId: true, studio: { select: { ownerUserId: true } }, bookingStatus: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed =
    isAdminRole(user.role) ||
    booking.studio.ownerUserId === user.id ||
    booking.customerUserId === user.id;
  if (!allowed) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const row = await loadBookingIcsRowById(bookingId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const origin = resolveFrontdeskSiteUrl();
  const icsAuthenticatedUrl = origin ? `${origin}/api/bookings/${bookingId}/calendar` : null;

  let icsGuestUrl: string | null = null;
  if (guestCalendarLinksConfigured() && origin) {
    const { exp, sig } = createBookingCalendarGuestQuery(bookingId);
    if (sig) {
      const u = new URL(origin);
      u.pathname = `/api/bookings/${bookingId}/calendar/guest`;
      u.searchParams.set("exp", String(exp));
      u.searchParams.set("sig", sig);
      icsGuestUrl = u.toString();
    }
  }

  return NextResponse.json({
    googleCalendarUrl: buildGoogleCalendarAddUrl(row),
    outlookCalendarUrl: buildOutlookWebCalendarUrl(row),
    icsAuthenticatedUrl,
    icsGuestUrl,
    bookingStatus: booking.bookingStatus,
  });
}
