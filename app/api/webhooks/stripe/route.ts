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
import { orderConfirmationCopy, sendOrderEmails } from "@/lib/email/order-notify";
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

    // --- Studio activation (platform-level, no Connect) ---
    if (session.metadata?.type === "studio_activation") {
      const studioId = session.metadata.studioId;
      if (studioId) {
        await prisma.studio.updateMany({
          where: { id: studioId, activationPaidAt: null },
          data: { activationPaidAt: new Date(), activationSessionId: session.id },
        });
      }
      return NextResponse.json({ received: true });
    }

    // --- Order / booking checkout (via Connect) ---
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
        return { skip: true, confirmedBookingIds: [] as string[], pendingApprovalIds: [] as string[], autoCancelledIds: [] as string[] };
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
      const autoCancelledIds: string[] = [];

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
            autoCancelledIds.push(b.id);
          }
        }
      }

      const cartId = session.metadata?.cartId;
      if (cartId) {
        await tx.cartItem.deleteMany({ where: { cartId } });
      }
      return { skip: false, confirmedBookingIds, pendingApprovalIds, autoCancelledIds };
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

    // Notify customers whose bookings were auto-cancelled due to capacity
    const cancelledRows = await loadBookingEmailContext(processed.autoCancelledIds);
    for (const it of cancelledRows) {
      const b = it.booking;
      if (!b) continue;
      try {
        await sendBookingEmails({
          customerEmail: b.customerEmail,
          studioEmail: it.vendor?.email ?? "",
          subject: `Booking cancelled — ${b.experience.title}`,
          customerHtml: `<p>Hi ${b.customerName},</p><p>Unfortunately your booking for <strong>${b.experience.title}</strong> was automatically cancelled because the session reached capacity before your payment could be confirmed.</p><p>A refund of €${((b.depositAmountCents || b.totalAmountCents) / 100).toFixed(2)} will be processed. If you have questions, contact the studio directly.</p>`,
          studioHtml: `<p>Booking for <strong>${b.customerName}</strong> (${b.customerEmail}) was auto-cancelled for <strong>${b.experience.title}</strong> due to capacity. A refund review is required.</p>`,
        });
      } catch (e) {
        console.error("[booking-email-cancel]", e);
      }
    }

    const productEmailItems = await prisma.orderItem.findMany({
      where: { orderId, itemType: "product" },
      include: {
        product: { select: { title: true } },
        vendor: { select: { id: true, displayName: true, email: true } },
      },
    });

    if (productEmailItems.length > 0) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order && !order.orderConfirmationSentAt) {
        const studioNames = [...new Set(productEmailItems.map((i) => i.vendor.displayName))];
        const studioLabel = studioNames.length === 1 ? studioNames[0]! : `${studioNames.length} partner studios`;

        const customerLines = productEmailItems.map(
          (it) => `${it.vendor.displayName}: ${it.product?.title ?? "Product"} × ${it.quantity}`,
        );
        const totalEur = (order.totalCents / 100).toFixed(2);
        const { customer } = orderConfirmationCopy({
          customerName: order.customerName,
          studioName: studioLabel,
          items: customerLines,
          totalEur,
          shippingMethod: order.shippingMethod,
          trackingNumber: null,
        });

        try {
          await sendOrderEmails({
            customerEmail: order.customerEmail,
            subject: `Order confirmed — PotteryMania`,
            customerHtml: customer,
          });
        } catch (e) {
          console.error("[order-email]", e);
        }

        const byVendor = new Map<string, typeof productEmailItems>();
        for (const it of productEmailItems) {
          const list = byVendor.get(it.vendorId) ?? [];
          list.push(it);
          byVendor.set(it.vendorId, list);
        }

        for (const lines of byVendor.values()) {
          const v = lines[0]!.vendor;
          if (!v.email) continue;
          const vendorLineItems = lines.map((it) => `${it.product?.title ?? "Product"} × ${it.quantity}`);
          const vendorSubtotalCents = lines.reduce((sum, it) => sum + it.priceSnapshotCents * it.quantity, 0);
          const vendorTotalEur = (vendorSubtotalCents / 100).toFixed(2);
          const { vendor: vendorHtml } = orderConfirmationCopy({
            customerName: order.customerName,
            studioName: v.displayName,
            items: vendorLineItems,
            totalEur: vendorTotalEur,
            shippingMethod: null,
            trackingNumber: null,
          });
          try {
            await sendOrderEmails({
              vendorEmail: v.email,
              subject: `New order — ${order.customerName}`,
              vendorHtml,
            });
          } catch (e) {
            console.error("[order-email-vendor]", e);
          }
        }

        await prisma.order.update({
          where: { id: orderId },
          data: { orderConfirmationSentAt: new Date(), vendorNotificationSentAt: new Date() },
        });
      }
    }

    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
