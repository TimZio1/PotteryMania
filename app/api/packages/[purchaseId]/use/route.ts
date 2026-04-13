import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { consumePackageCreditForBooking } from "@/lib/packages/credits";

type Ctx = { params: Promise<{ purchaseId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { purchaseId } = await ctx.params;
  let body: { bookingId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
  if (!bookingId) return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      customerUserId: user.id,
    },
    select: {
      id: true,
      studioId: true,
      experienceId: true,
      classPackagePurchaseId: true,
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.classPackagePurchaseId && booking.classPackagePurchaseId !== purchaseId) {
    return NextResponse.json({ error: "Booking already linked to a different package purchase" }, { status: 409 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: { classPackagePurchaseId: purchaseId },
    });
    return consumePackageCreditForBooking(tx, {
      bookingId: booking.id,
      purchaseId,
      userId: user.id,
      studioId: booking.studioId,
      experienceId: booking.experienceId,
    });
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, alreadyUsed: result.alreadyUsed ?? false });
}
