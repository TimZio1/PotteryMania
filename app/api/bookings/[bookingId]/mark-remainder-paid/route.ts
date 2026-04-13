import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { settleBookingRemainderPayment } from "@/lib/bookings/remainder";

type Ctx = { params: Promise<{ bookingId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { bookingId } = await ctx.params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      studio: { select: { ownerUserId: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const result = await prisma.$transaction((tx) =>
    settleBookingRemainderPayment(tx, {
      bookingId,
      provider: "manual",
    }),
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, skip: result.skip ?? false });
}
