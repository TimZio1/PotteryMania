import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { sendBookingEmails, bookingConfirmationCopy } from "@/lib/email/booking-notify";

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

    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing || existing.orderStatus === "paid") {
      return NextResponse.json({ received: true });
    }

    const pi = session.payment_intent;
    const piId = typeof pi === "string" ? pi : pi?.id ?? null;
    const amount = session.amount_total ?? existing.totalCents;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: "paid",
          paymentStatus: "paid",
        },
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
          await tx.booking.update({
            where: { id: b.id },
            data: { bookingStatus: "confirmed", paymentStatus: "paid" },
          });
          await tx.bookingSlot.update({
            where: { id: b.slotId },
            data: { capacityReserved: { increment: b.participantCount } },
          });
          const slot = await tx.bookingSlot.findUnique({ where: { id: b.slotId } });
          if (slot && slot.capacityReserved >= slot.capacityTotal) {
            await tx.bookingSlot.update({
              where: { id: b.slotId },
              data: { status: "full" },
            });
          }
        }
      }
      const cartId = session.metadata?.cartId;
      if (cartId) {
        await tx.cartItem.deleteMany({ where: { cartId } });
      }
    });

    const bookingRows = await prisma.orderItem.findMany({
      where: { orderId, itemType: "booking", bookingId: { not: null } },
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