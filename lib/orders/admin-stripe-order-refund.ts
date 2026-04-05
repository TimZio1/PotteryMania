import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export type OrderRefundSnapshot =
  | { ok: false; error: string }
  | {
      ok: true;
      paymentId: string;
      paymentIntentId: string;
      currency: string;
      amountReceivedCents: number;
      amountRefundedCents: number;
      refundableCents: number;
    };

function chargeFromPi(pi: Stripe.PaymentIntent): Stripe.Charge | null {
  const c = pi.latest_charge;
  if (typeof c !== "object" || c === null) return null;
  if ("deleted" in c && c.deleted) return null;
  return c as Stripe.Charge;
}

/**
 * Live refundable balance from Stripe (Connect PaymentIntent + charge).
 */
export async function getStripeOrderRefundSnapshot(orderId: string): Promise<OrderRefundSnapshot> {
  const pay = await prisma.payment.findFirst({
    where: {
      orderId,
      provider: "stripe",
      paymentStatus: { in: ["succeeded", "partially_refunded"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!pay?.providerPaymentId) {
    return { ok: false, error: "No succeeded Stripe payment on this order." };
  }

  try {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(pay.providerPaymentId, {
      expand: ["latest_charge"],
    });
    const charge = chargeFromPi(pi);
    if (!charge) {
      return { ok: false, error: "PaymentIntent has no charge yet." };
    }
    const received = charge.amount;
    const alreadyRefunded = charge.amount_refunded ?? 0;
    const refundable = Math.max(0, received - alreadyRefunded);
    return {
      ok: true,
      paymentId: pay.id,
      paymentIntentId: pay.providerPaymentId,
      currency: pay.currency || "EUR",
      amountReceivedCents: received,
      amountRefundedCents: alreadyRefunded,
      refundableCents: refundable,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return { ok: false, error: msg };
  }
}

export type AdminOrderRefundExecuteResult =
  | { ok: true; refundId: string; amountCents: number; fullyRefunded: boolean }
  | { ok: false; error: string };

/**
 * Creates a Stripe refund (reverse transfer + application fee) and updates `Payment` + `Order` rows.
 */
export async function executeAdminStripeOrderRefund(opts: {
  orderId: string;
  /** Omit or undefined = refund remaining Stripe balance up to snapshot. */
  amountCents?: number;
  adminUserId: string;
  reason: string;
}): Promise<AdminOrderRefundExecuteResult> {
  const reason = opts.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: "Reason must be at least 3 characters." };
  }

  const snap = await getStripeOrderRefundSnapshot(opts.orderId);
  if (!snap.ok) return { ok: false, error: snap.error };
  if (snap.refundableCents <= 0) {
    return { ok: false, error: "Nothing left to refund on Stripe." };
  }

  let requested: number;
  if (opts.amountCents === undefined || opts.amountCents === null) {
    requested = snap.refundableCents;
  } else {
    if (!Number.isFinite(opts.amountCents) || opts.amountCents < 1) {
      return { ok: false, error: "Refund amount must be at least 1 cent." };
    }
    requested = Math.floor(opts.amountCents);
  }
  const amount = Math.min(requested, snap.refundableCents);
  if (amount < 1) {
    return { ok: false, error: "Refund amount must be at least 1 cent." };
  }

  try {
    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: snap.paymentIntentId,
      amount,
      reverse_transfer: true,
      refund_application_fee: true,
      metadata: {
        orderId: opts.orderId,
        source: "admin_order_refund",
        adminUserId: opts.adminUserId,
      },
    });

    const fullyRefunded = amount >= snap.refundableCents;

    const paymentStatus = fullyRefunded ? "refunded" : "partially_refunded";
    const orderPaymentStatus = fullyRefunded ? "refunded" : "partially_refunded";
    const orderStatus = fullyRefunded ? "refunded" : "partially_refunded";

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: snap.paymentId },
        data: { paymentStatus },
      }),
      prisma.order.update({
        where: { id: opts.orderId },
        data: {
          paymentStatus: orderPaymentStatus,
          orderStatus,
        },
      }),
    ]);

    return { ok: true, refundId: refund.id, amountCents: amount, fullyRefunded };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe refund failed";
    return { ok: false, error: msg };
  }
}
