import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { sendBookingEmails, bookingConfirmationCopy } from "@/lib/email/booking-notify";
import { safeReserveCapacity } from "@/lib/bookings/slot-lock";
import type { Prisma } from "@prisma/client";

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
        return { skip: true, confirmedBookingIds: [] as string[] };
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
      for (const it of items) {
        if (it.itemType === "product" && it.productId) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stockQuantity: { decrement: it.quantity } },
          });
        }
        if (it.itemType === "booking" && it.bookingId) {
          const b = await tx.booking.findUnique({ where: { id: it.bookingId } });
          if (!b || b.paymentStatus !== "pending") continue;
          try {
            await safeReserveCapacity(tx, b.slotId, b.participantCount, b.seatType);

            await tx.booking.update({
              where: { id: b.id },
              data: { bookingStatus: "confirmed", paymentStatus: "paid" },
            });

            await tx.bookingAuditLog.create({
              data: {
                bookingId: b.id,
                actionType: "confirmed",
                actorRole: "system",
                payload: { trigger: "stripe_webhook", sessionId: session.id } as Prisma.InputJsonValue,
              },
            });
            confirmedBookingIds.push(b.id);
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : "Capacity exceeded at confirmation time";
            await tx.booking.update({
              where: { id: b.id },
              data: {
                bookingStatus: "cancelled_by_admin",
                paymentStatus: "paid",
                notes: [b.notes, `AUTO-CANCELLED AFTER PAYMENT: ${reason}`].filter(Boolean).join("\n"),
              },
            });
            await tx.bookingCancellation.create({
              data: {
                bookingId: b.id,
                cancelledByRole: "admin",
                cancellationReason: "capacity_exceeded_after_payment",
                refundOutcome: "manual_refund_review_required",
                refundAmountCents: b.totalAmountCents,
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
      return { skip: false, confirmedBookingIds };
    });
    if (processed.skip) {
      return NextResponse.json({ received: true });
    }

    const bookingRows = await prisma.orderItem.findMany({
      where: {
        orderId,
        itemType: "booking",
        bookingId: { in: processed.confirmedBookingIds },
      },
      include: {
        booking: { include: { experience: true, slot: true } },
        vendor: true,
      },
    });

    for (const it of bookingRows) {
      const b = it.booking;
      if (!b || !it.vendor.email) continue;
      const slotDate = b.slot.slotDate.toISOString().slice(0, 10);
      const { customer, studio } = bookingConfirmationCopy({
        experienceTitle: b.experience.title,
        studioName: it.vendor.displayName,
        slotDate,
        startTime: b.slot.startTime,
        participants: b.participantCount,
        totalEur: (b.totalAmountCents / 100).toFixed(2),
      });
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

    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}