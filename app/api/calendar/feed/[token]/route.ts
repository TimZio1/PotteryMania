import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildBookingsIcsCalendar } from "@/lib/calendar/booking-ics";
import { loadCustomerBookingIcsRows } from "@/lib/calendar/load-booking-ics-rows";

type Ctx = { params: Promise<{ token: string }> };

/**
 * Unauthenticated ICS feed for calendar apps (Apple/Google “subscribe by URL”).
 * Token is issued per user via `ensureCalendarFeedToken` and returned from `/api/my-bookings/calendar-link`.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  if (!token || token.length < 8) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await prisma.user.findFirst({
    where: { calendarFeedToken: token },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await loadCustomerBookingIcsRows(user.id);
  const body = buildBookingsIcsCalendar(rows, "PotteryMania — my bookings");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
