import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";
import { isReschedulable } from "@/lib/bookings/status";
import { slotCanAcceptReschedule, slotSpotsForReschedule } from "@/lib/bookings/reschedule-slot-utils";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ bookingId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { bookingId } = await ctx.params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      studio: { select: { ownerUserId: true } },
      slot: true,
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  if (isAdminRole(user.role)) {
    // ok
  } else if (booking.studio.ownerUserId === user.id) {
    // ok
  } else if (booking.customerUserId === user.id) {
    // ok
  } else {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (!isReschedulable(booking.bookingStatus)) {
    return NextResponse.json({
      reschedulable: false,
      reason: `Bookings in status "${booking.bookingStatus}" cannot be rescheduled.`,
      currentSlotId: booking.slotId,
      slots: [],
    });
  }

  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);

  const rawSlots = await prisma.bookingSlot.findMany({
    where: {
      experienceId: booking.experienceId,
      id: { not: booking.slotId },
      slotDate: { gte: from, lte: to },
      status: "open",
    },
    orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
  });

  const slots = rawSlots
    .filter((s) => slotCanAcceptReschedule(s, booking.participantCount, booking.seatType))
    .map((s) => {
      const { spotsLeft } = slotSpotsForReschedule(s, booking.participantCount, booking.seatType);
      return {
        id: s.id,
        slotDate: s.slotDate.toISOString().slice(0, 10),
        startTime: s.startTime,
        endTime: s.endTime,
        spotsLeft,
      };
    });

  return NextResponse.json({
    reschedulable: true,
    currentSlotId: booking.slotId,
    experienceId: booking.experienceId,
    slots,
  });
}
