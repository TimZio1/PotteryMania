import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyBookingCalendarGuestQuery } from "@/lib/calendar/booking-calendar-guest";
import { buildBookingsIcsCalendar } from "@/lib/calendar/booking-ics";
import { loadBookingIcsRowById } from "@/lib/calendar/load-booking-ics-rows";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ bookingId: string }> };

/**
 * Signed, time-limited ICS download for customers (e.g. from confirmation email without login).
 */
export async function GET(req: Request, ctx: Ctx) {
  const { bookingId } = await ctx.params;
  const u = new URL(req.url);
  const expRaw = u.searchParams.get("exp");
  const sig = u.searchParams.get("sig")?.trim() ?? "";
  const exp = expRaw ? Number(expRaw) : NaN;
  if (!verifyBookingCalendarGuestQuery(bookingId, exp, sig)) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { bookingStatus: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (
    booking.bookingStatus !== "confirmed" &&
    booking.bookingStatus !== "completed" &&
    booking.bookingStatus !== "awaiting_vendor_approval" &&
    booking.bookingStatus !== "pending"
  ) {
    return NextResponse.json({ error: "Booking not available" }, { status: 410 });
  }

  const row = await loadBookingIcsRowById(bookingId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = buildBookingsIcsCalendar([row], "PotteryMania booking");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="potterymania-booking-${bookingId.slice(0, 8)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
