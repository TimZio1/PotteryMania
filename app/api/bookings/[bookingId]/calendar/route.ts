import { NextResponse } from "next/server";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { buildBookingsIcsCalendar } from "@/lib/calendar/booking-ics";
import { loadBookingIcsRowById } from "@/lib/calendar/load-booking-ics-rows";

type Ctx = { params: Promise<{ bookingId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { bookingId } = await ctx.params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { customerUserId: true, studio: { select: { ownerUserId: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const allowed =
    isAdminRole(user.role) ||
    booking.studio.ownerUserId === user.id ||
    booking.customerUserId === user.id;
  if (!allowed) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const row = await loadBookingIcsRowById(bookingId);
  if (!row) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

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
