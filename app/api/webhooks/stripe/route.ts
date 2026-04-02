import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import {
  sendBookingEmails,
  bookingConfirmationCopy,
  bookingPendingApprovalCopy,
} from "@/lib/email/booking-notify";
import { safeReserveCapacity } from "@/lib/bookings/slot-lock";
import { allocateTicketRef } from "@/lib/bookings/ticket-ref";
import type { Prisma } from "@prisma/client";

/**
 * Payment + manual approval policy: Stripe success always reserves slot capacity (via safeReserveCapacity).
 * If experience.bookingApprovalRequired, booking becomes awaiting_vendor_approval until vendor approves → confirmed.
 * Reject (vendor) releases capacity; refund of charged amount is manual / out of band unless you add Stripe Refund API.
 */

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (!orderId) return NextResponse.json({ received: true });
    const pi = session.payment_intent;
    const piId = typeof pi === "string" ? pi : pi?.id ?? null;
    const processed = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<
        { id: string; order_status: string; total_cents: number }[]
      >(
        `SELECT id, order_status::text, total_cents
         FROM orders
         WHERE id = $1::uuid
         FOR UPDATE`,
        orderId
      );
      if (!rows.length || rows[0].order_status === "paid") {
        return { skip: true, confirmedBookingIds: [] as string[], pendingApprovalIds: [] as string[] };
      }
      const amount = session.amount_total ?? rows[0].total_cents;

      await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: "paid", paymentStatus: "paid" },
      });

      const existingPay = await tx.payment.findFirst({ where: { orderId } });
      if (!existingPay) {
        await tx.payment.create({
          data: {
            orderId,
            provider: "stripe",
            providerPaymentId: piId,
            paymentStatus: "succeeded",
            amountCents: amount,
            currency: (session.currency || "eur").toUpperCase(),
          },
        });
      }

      const items = await tx.orderItem.findMany({ where: { orderId } });
      const confirmedBookingIds: string[] = [];
      const pendingApprovalIds: string[] = [];

      for (const it of items) {
        if (it.itemType === "product" && it.productId) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stockQuantity: { decrement: it.quantity } },
          });
        }
        if (it.itemType === "booking" && it.bookingId) {
          const b = await tx.booking.findUnique({
            where: { id: it.bookingId },
            include: { experience: true },
          });
          if (!b || b.paymentStatus !== "pending") continue;

          let ticketRef = b.ticketRef;
          if (!ticketRef) {
            ticketRef = await allocateTicketRef(tx);
          }

          try {
            await safeReserveCapacity(tx, b.slotId, b.participantCount, b.seatType);

            const hasBalance = b.remainingBalanceCents > 0;
            const paymentStatus = hasBalance ? "partial" : "paid";
            const needsApproval = b.experience.bookingApprovalRequired;
            const nextStatus = needsApproval ? "awaiting_vendor_approval" : "confirmed";

            await tx.booking.update({
              where: { id: b.id },
              data: {
                ticketRef,
                bookingStatus: nextStatus,
                paymentStatus,
              },
            });

            await tx.bookingAuditLog.create({
              data: {
                bookingId: b.id,
                actionType: needsApproval ? "payment_captured_pending_approval" : "confirmed",
                actorRole: "system",
                payload: {
                  trigger: "stripe_webhook",
                  sessionId: session.id,
                  paymentStatus,
                  needsApproval,
                } as Prisma.InputJsonValue,
              },
            });

            if (needsApproval) pendingApprovalIds.push(b.id);
            else confirmedBookingIds.push(b.id);
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : "Capacity exceeded at confirmation time";
            const paidNow = b.remainingBalanceCents > 0 ? "partial" : "paid";
            await tx.booking.update({
              where: { id: b.id },
              data: {
                ticketRef,
                bookingStatus: "cancelled_by_admin",
                paymentStatus: paidNow,
                notes: [b.notes, `AUTO-CANCELLED AFTER PAYMENT: ${reason}`].filter(Boolean).join("\n"),
              },
            });
            await tx.bookingCancellation.create({
              data: {
                bookingId: b.id,
                cancelledByRole: "admin",
                cancellationReason: "capacity_exceeded_after_payment",
                refundOutcome: "manual_refund_review_required",
                refundAmountCents: b.depositAmountCents || b.totalAmountCents,
              },
            });
            await tx.bookingAuditLog.create({
              data: {
                bookingId: b.id,
                actionType: "confirmation_failed",
                actorRole: "system",
                payload: {
                  trigger: "stripe_webhook",
                  sessionId: session.id,
                  reason,
                } as Prisma.InputJsonValue,
              },
            });
          }
        }
      }

      const cartId = session.metadata?.cartId;
      if (cartId) {
        await tx.cartItem.deleteMany({ where: { cartId } });
      }
      return { skip: false, confirmedBookingIds, pendingApprovalIds };
    });
    if (processed.skip) {
      return NextResponse.json({ received: true });
    }

    const loadBookingEmailContext = async (bookingIds: string[]) => {
      if (!bookingIds.length) return [];
      return prisma.orderItem.findMany({
        where: {
          orderId,
          itemType: "booking",
          bookingId: { in: bookingIds },
        },
        include: {
          booking: { include: { experience: true, slot: true } },
          vendor: true,
        },
      });
    };

    const confirmedRows = await loadBookingEmailContext(processed.confirmedBookingIds);
    const pendingRows = await loadBookingEmailContext(processed.pendingApprovalIds);

    const emailBlock = (b: (typeof confirmedRows)[0]["booking"]) => {
      if (!b) return null;
      const slotDate = b.slot.slotDate.toISOString().slice(0, 10);
      return {
        experienceTitle: b.experience.title,
        studioName: "",
        slotDate,
        startTime: b.slot.startTime,
        participants: b.participantCount,
        totalEur: (b.totalAmountCents / 100).toFixed(2),
        ticketRef: b.ticketRef ?? "",
        paidEur: (b.depositAmountCents / 100).toFixed(2),
        balanceEur: (b.remainingBalanceCents / 100).toFixed(2),
        seatType: b.seatType,
      };
    };

    for (const it of confirmedRows) {
      const b = it.booking;
      if (!b || !it.vendor.email) continue;
      const base = emailBlock(b);
      if (!base) continue;
      base.studioName = it.vendor.displayName;
      const { customer, studio } = bookingConfirmationCopy(base);
      try {
        await sendBookingEmails({
          customerEmail: b.customerEmail,
          studioEmail: it.vendor.email,
          subject: `Booking confirmed: ${b.experience.title}`,
          customerHtml: customer,
          studioHtml: studio,
        });
      } catch (e) {
        console.error("[booking-email]", e);
      }
    }

    for (const it of pendingRows) {
      const b = it.booking;
      if (!b || !it.vendor.email) continue;
      const base = emailBlock(b);
      if (!base) continue;
      base.studioName = it.vendor.displayName;
      const { customer, studio } = bookingPendingApprovalCopy(base);
      try {
        await sendBookingEmails({
          customerEmail: b.customerEmail,
          studioEmail: it.vendor.email,
          subject: `Booking received — approval pending: ${b.experience.title}`,
          customerHtml: customer,
          studioHtml: studio,
        });
      } catch (e) {
        console.error("[booking-email]", e);
      }
    }

    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
