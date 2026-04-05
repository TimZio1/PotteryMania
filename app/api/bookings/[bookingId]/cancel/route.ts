import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";
import { cancelBooking } from "@/lib/bookings/cancel";
import { stripeRefundForBooking } from "@/lib/bookings/stripe-refund-booking";
import { sendBookingEmails } from "@/lib/email/booking-notify";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ bookingId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { bookingId } = await ctx.params;
  let body: { reason?: string } = {};
  try {
    body = await req.json();
  } catch {}

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      studio: { select: { ownerUserId: true, displayName: true, email: true } },
      experience: { select: { title: true } },
      slot: true,
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  let role: "customer" | "vendor" | "admin";
  if (isAdminRole(user.role)) {
    role = "admin";
  } else if (booking.studio.ownerUserId === user.id) {
    role = "vendor";
  } else if (booking.customerUserId === user.id) {
    role = "customer";
  } else {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const result = await cancelBooking({
    bookingId,
    role,
    userId: user.id,
    reason: body.reason,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  let stripeRefund: { refundId: string; amountCents: number } | null = null;
  let stripeRefundError: string | null = null;
  if (result.refundAmountCents > 0) {
    const sr = await stripeRefundForBooking(bookingId, result.refundAmountCents);
    if (sr.ok && "refundId" in sr) {
      stripeRefund = { refundId: sr.refundId, amountCents: sr.amountCents };
      await prisma.bookingAuditLog.create({
        data: {
          bookingId,
          actionType: "stripe_refund_succeeded",
          actorRole: "system",
          payload: {
            refundId: sr.refundId,
            amountCents: sr.amountCents,
          } as Prisma.InputJsonValue,
        },
      });
    } else if (!sr.ok) {
      stripeRefundError = sr.error;
      const latest = await prisma.bookingCancellation.findFirst({
        where: { bookingId },
        orderBy: { createdAt: "desc" },
      });
      if (latest) {
        await prisma.bookingCancellation.update({
          where: { id: latest.id },
          data: { refundOutcome: "manual_refund_review_required" },
        });
      }
      await prisma.bookingAuditLog.create({
        data: {
          bookingId,
          actionType: "stripe_refund_failed",
          actorRole: "system",
          payload: { error: sr.error, requestedCents: result.refundAmountCents } as Prisma.InputJsonValue,
        },
      });
    }
  }

  try {
    const slotDate = booking.slot.slotDate.toISOString().slice(0, 10);
    const subject = `Booking cancelled: ${booking.experience.title} on ${slotDate}`;
    const info = `<p>Experience: <strong>${booking.experience.title}</strong></p>
      <p>Date: ${slotDate} at ${booking.slot.startTime}</p>
      <p>Cancelled by: ${role}</p>
      <p>Refund outcome: ${result.refundOutcome}</p>`;
    await sendBookingEmails({
      customerEmail: booking.customerEmail,
      studioEmail: booking.studio.email || undefined,
      subject,
      customerHtml: `<h1>Booking cancelled</h1>${info}`,
      studioHtml: booking.studio.email ? `<h1>Booking cancelled</h1>${info}` : undefined,
    });
  } catch (e) {
    console.error("[cancel-email]", e);
  }

  return NextResponse.json({
    ...result,
    stripeRefund,
    stripeRefundError,
  });
}