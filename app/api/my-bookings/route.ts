import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const bookings = await prisma.booking.findMany({
    where: { customerUserId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      participantCount: true,
      bookingStatus: true,
      paymentStatus: true,
      totalAmountCents: true,
      depositAmountCents: true,
      remainingBalanceCents: true,
      depositPaidAt: true,
      remainderPaidAt: true,
      remainderPaymentLink: true,
      ticketRef: true,
      seatType: true,
      notes: true,
      bookingAddOns: { select: { addOnName: true, quantity: true, unitPriceCents: true } },
      intakeResponses: { select: { labelSnapshot: true, value: true, includeInInvoiceSnapshot: true } },
      experience: { select: { id: true, title: true, coverImageUrl: true } },
      slot: { select: { id: true, slotDate: true, startTime: true, endTime: true, status: true } },
      studio: { select: { displayName: true } },
      cancellations: { select: { cancelledByRole: true, refundOutcome: true, createdAt: true }, take: 1, orderBy: { createdAt: "desc" } },
      reviews: { where: { authorUserId: user.id }, select: { id: true }, take: 1 },
    },
    take: 100,
  });

  return NextResponse.json({ bookings });
}