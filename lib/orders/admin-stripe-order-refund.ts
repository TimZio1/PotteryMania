import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { upsertLedgerEntry } from "@/lib/finance/ledger";
import { LEDGER_SOURCE_SYSTEM } from "@/lib/finance/constants";
import { logApiError } from "@/lib/monitoring";

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

async function resolveConnectedAccountForOrder(orderId: string): Promise<string | null> {
  const payment = await prisma.payment.findFirst({
    where: {
      orderId,
      provider: "stripe",
      paymentStatus: { in: ["succeeded", "partially_refunded"] },
    },
    orderBy: { createdAt: "desc" },
    select: { providerAccountId: true },
  });
  if (payment?.providerAccountId !== undefined) {
    return payment.providerAccountId ?? null;
  }
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

  const connectedAccountId = await resolveConnectedAccountForOrder(orderId);

  try {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(
      pay.providerPaymentId,
      { expand: ["latest_charge"] },
      connectedAccountId ? { stripeAccount: connectedAccountId } : undefined,
    );
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

  const orderForLedger = await prisma.order.findUnique({
    where: { id: opts.orderId },
    select: { customerUserId: true, currency: true, shippingAddressJson: true },
  });

  try {
    const stripe = getStripe();
    const connectedAccountId = await resolveConnectedAccountForOrder(opts.orderId);
    const refund = await stripe.refunds.create(
      {
        payment_intent: snap.paymentIntentId,
        amount,
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: {
          orderId: opts.orderId,
          source: "admin_order_refund",
          adminUserId: opts.adminUserId,
        },
      },
      connectedAccountId ? { stripeAccount: connectedAccountId } : undefined,
    );

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

    const ship = orderForLedger?.shippingAddressJson;
    const country =
      ship &&
      typeof ship === "object" &&
      ship !== null &&
      "country" in ship &&
      typeof (ship as { country: unknown }).country === "string"
        ? (ship as { country: string }).country.trim() || null
        : null;
    const createdSec = typeof refund.created === "number" ? refund.created : Math.floor(Date.now() / 1000);
    const created = new Date(createdSec * 1000);
    const entryDate = new Date(
      Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()),
    );
    try {
      await upsertLedgerEntry({
        dedupeKey: `stripe_refund:${refund.id}`,
        entryDate,
        entryType: "refund",
        amountCents: amount,
        currency: orderForLedger?.currency ?? snap.currency,
        direction: "debit",
        sourceSystem: LEDGER_SOURCE_SYSTEM.stripe,
        sourceType: "stripe_refund",
        sourceId: refund.id,
        orderId: opts.orderId,
        userId: orderForLedger?.customerUserId ?? null,
        country,
        notes: `Admin refund: ${reason.slice(0, 240)}`,
        metadata: {
          adminUserId: opts.adminUserId,
          orderId: opts.orderId,
          paymentIntentId: snap.paymentIntentId,
          fullyRefunded,
        },
      });
    } catch (e) {
      logApiError("admin_refund_ledger_upsert", e, { orderId: opts.orderId, refundId: refund.id });
    }

    return { ok: true, refundId: refund.id, amountCents: amount, fullyRefunded };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe refund failed";
    return { ok: false, error: msg };
  }
}
