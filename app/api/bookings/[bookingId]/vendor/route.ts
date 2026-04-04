import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { safeReleaseCapacity } from "@/lib/bookings/slot-lock";
import { sendBookingEmails, bookingConfirmationCopy, bookingRejectedCopy } from "@/lib/email/booking-notify";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ bookingId: string }> };

/**
 * Vendor-only: approve or reject a booking in awaiting_vendor_approval.
 * Reject releases slot capacity; refund of charged amount is manual unless you integrate Stripe refunds.
 */
export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { bookingId } = await ctx.params;
  let body: { action?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  if (action !== "approve" && action !== "reject" && action !== "mark_completed") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      studio: { select: { ownerUserId: true, email: true, displayName: true } },
      experience: true,
      slot: true,
    },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (action === "mark_completed") {
    if (booking.bookingStatus !== "confirmed") {
      return NextResponse.json({ error: "Only confirmed bookings can be marked completed" }, { status: 400 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { bookingStatus: "completed" },
      });
      await tx.bookingAuditLog.create({
        data: {
          bookingId,
          actionType: "vendor_marked_completed",
          actorRole: "vendor",
          actorUserId: user.id,
          payload: {} as Prisma.InputJsonValue,
        },
      });
    });
    return NextResponse.json({ ok: true, bookingStatus: "completed" });
  }

  if (booking.bookingStatus !== "awaiting_vendor_approval") {
    return NextResponse.json({ error: "Booking is not awaiting approval" }, { status: 400 });
  }

  if (action === "approve") {
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { bookingStatus: "confirmed" },
      });
      await tx.bookingAuditLog.create({
        data: {
          bookingId,
          actionType: "vendor_approved",
          actorRole: "vendor",
          actorUserId: user.id,
          payload: {} as Prisma.InputJsonValue,
        },
      });
    });

    const slotDate = booking.slot.slotDate.toISOString().slice(0, 10);
    const copy = bookingConfirmationCopy({
      experienceTitle: booking.experience.title,
      studioName: booking.studio.displayName,
      slotDate,
      startTime: booking.slot.startTime,
      participants: booking.participantCount,
      totalEur: (booking.totalAmountCents / 100).toFixed(2),
      ticketRef: booking.ticketRef ?? "",
      paidEur: (booking.depositAmountCents / 100).toFixed(2),
      balanceEur: (booking.remainingBalanceCents / 100).toFixed(2),
      seatType: booking.seatType,
    });

    try {
      await sendBookingEmails({
        customerEmail: booking.customerEmail,
        studioEmail: booking.studio.email,
        subject: `Booking confirmed: ${booking.experience.title}`,
        customerHtml: copy.customer,
        studioHtml: copy.studio,
      });
    } catch (e) {
      console.error("[vendor-approve-email]", e);
    }

    return NextResponse.json({ ok: true, bookingStatus: "confirmed" });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  await prisma.$transaction(async (tx) => {
    await safeReleaseCapacity(tx, booking.slotId, booking.participantCount, booking.seatType);
    await tx.booking.update({
      where: { id: bookingId },
      data: { bookingStatus: "cancelled_by_vendor" },
    });
    await tx.bookingCancellation.create({
      data: {
        bookingId,
        cancelledByRole: "vendor",
        cancelledByUserId: user.id,
        cancellationReason: reason || "vendor_rejected",
        refundOutcome: "manual_refund_review_required",
        refundAmountCents: booking.depositAmountCents || booking.totalAmountCents,
      },
    });
    await tx.bookingAuditLog.create({
      data: {
        bookingId,
        actionType: "vendor_rejected",
        actorRole: "vendor",
        actorUserId: user.id,
        payload: { reason } as Prisma.InputJsonValue,
      },
    });
  });

  const slotDate = booking.slot.slotDate.toISOString().slice(0, 10);
  const rejectedHtml = bookingRejectedCopy({
    experienceTitle: booking.experience.title,
    studioName: booking.studio.displayName,
    slotDate,
    startTime: booking.slot.startTime,
    participants: booking.participantCount,
    totalEur: (booking.totalAmountCents / 100).toFixed(2),
    ticketRef: booking.ticketRef ?? "",
    reason,
  });

  try {
    await sendBookingEmails({
      customerEmail: booking.customerEmail,
      studioEmail: booking.studio.email ?? undefined,
      subject: `Booking not approved: ${booking.experience.title}`,
      customerHtml: rejectedHtml,
      studioHtml: booking.studio.email
        ? `<h1>You declined a booking</h1><p>${booking.experience.title} — ${booking.customerEmail}</p>`
        : undefined,
    });
  } catch (e) {
    console.error("[vendor-reject-email]", e);
  }

  return NextResponse.json({ ok: true, bookingStatus: "cancelled_by_vendor" });
}
