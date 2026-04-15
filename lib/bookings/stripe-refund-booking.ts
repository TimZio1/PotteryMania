import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export type StripeBookingRefundResult =
  | { ok: true; skipped: true }
  | { ok: true; refundId: string; amountCents: number }
  | { ok: false; error: string };

/**
 * Resolves the Stripe connected-account ID for an order via its vendor (studio).
 */
async function resolveConnectedAccountForOrder(orderId: string): Promise<string | null> {
  const item = await prisma.orderItem.findFirst({
    where: { orderId },
    select: { vendorId: true },
  });
  if (!item) return null;
  const sa = await prisma.stripeAccount.findUnique({
    where: { studioId: item.vendorId },
    select: { stripeAccountId: true },
  });
  return sa?.stripeAccountId ?? null;
}

/**
 * Refunds up to `amountCents` against the Stripe PaymentIntent tied to this booking's order (Connect checkout).
 */
export async function stripeRefundForBooking(bookingId: string, amountCents: number): Promise<StripeBookingRefundResult> {
  if (amountCents <= 0) return { ok: true, skipped: true };

  const item = await prisma.orderItem.findFirst({
    where: { bookingId, itemType: "booking" },
    select: { orderId: true },
  });
  if (!item) {
    return { ok: false, error: "No order line linked to this booking" };
  }

  const pay = await prisma.payment.findFirst({
    where: { orderId: item.orderId, provider: "stripe", paymentStatus: "succeeded" },
    orderBy: { createdAt: "desc" },
  });
  if (!pay?.providerPaymentId) {
    return { ok: false, error: "No succeeded Stripe payment on order" };
  }

  const connectedAccountId = await resolveConnectedAccountForOrder(item.orderId);
  if (!connectedAccountId) {
    return { ok: false, error: "No Stripe connected account found for this order's studio" };
  }

  const refundCents = Math.min(amountCents, pay.amountCents);
  if (refundCents <= 0) return { ok: true, skipped: true };

  try {
    const stripe = getStripe();
    const refund = await stripe.refunds.create(
      {
        payment_intent: pay.providerPaymentId,
        amount: refundCents,
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: { bookingId, source: "booking_cancel" },
      },
      { stripeAccount: connectedAccountId },
    );
    return { ok: true, refundId: refund.id, amountCents: refundCents };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe refund failed";
    return { ok: false, error: msg };
  }
}
