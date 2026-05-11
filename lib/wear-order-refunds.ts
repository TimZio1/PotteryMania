import type { Prisma, WearOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type WearOrderStripeRefundSnapshot = {
  paymentIntentId: string;
  stripeEventType: string;
  refundId?: string | null;
  refundStatus?: string | null;
  chargeId?: string | null;
  chargeAmountCents?: number | null;
  amountRefundedCents?: number | null;
  refundAmountCents?: number | null;
};

export type ApplyWearOrderStripeRefundResult = {
  matched: boolean;
  applied: boolean;
  fullyRefunded: boolean;
  orderId: string | null;
  previousStatus?: WearOrderStatus;
  reason?: string;
};

type LockedWearOrderRow = {
  id: string;
  status: WearOrderStatus;
  refunded_at: Date | null;
};

function finiteCents(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isFullyRefunded(snapshot: WearOrderStripeRefundSnapshot): boolean {
  const chargeAmount = finiteCents(snapshot.chargeAmountCents);
  const amountRefunded = finiteCents(snapshot.amountRefundedCents);
  return chargeAmount != null && chargeAmount > 0 && amountRefunded != null && amountRefunded >= chargeAmount;
}

function refundPayload(snapshot: WearOrderStripeRefundSnapshot, fullyRefunded: boolean): Prisma.InputJsonValue {
  return {
    paymentIntentId: snapshot.paymentIntentId,
    stripeEventType: snapshot.stripeEventType,
    refundId: snapshot.refundId ?? null,
    refundStatus: snapshot.refundStatus ?? null,
    chargeId: snapshot.chargeId ?? null,
    chargeAmountCents: snapshot.chargeAmountCents ?? null,
    amountRefundedCents: snapshot.amountRefundedCents ?? null,
    refundAmountCents: snapshot.refundAmountCents ?? null,
    fullyRefunded,
  };
}

export async function applyWearOrderStripeRefund(
  snapshot: WearOrderStripeRefundSnapshot,
): Promise<ApplyWearOrderStripeRefundResult> {
  const paymentIntentId = snapshot.paymentIntentId.trim();
  if (!paymentIntentId) {
    return {
      matched: false,
      applied: false,
      fullyRefunded: false,
      orderId: null,
      reason: "missing_payment_intent",
    };
  }

  const fullyRefunded = isFullyRefunded(snapshot);

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<LockedWearOrderRow[]>(
      `SELECT id, status::text, refunded_at
       FROM wear_orders
       WHERE stripe_payment_intent_id = $1
       FOR UPDATE`,
      paymentIntentId,
    );

    const order = rows[0];
    if (!order) {
      return {
        matched: false,
        applied: false,
        fullyRefunded,
        orderId: null,
        reason: "wear_order_not_found",
      };
    }

    await tx.wearOrderEvent.create({
      data: {
        orderId: order.id,
        eventType: fullyRefunded ? "stripe_refund_succeeded" : "stripe_refund_seen",
        eventSource: "stripe",
        message: fullyRefunded
          ? "Stripe reported the wear order charge as fully refunded."
          : "Stripe reported a refund event that is not a full charge refund.",
        payload: refundPayload(snapshot, fullyRefunded),
      },
    });

    if (!fullyRefunded) {
      return {
        matched: true,
        applied: false,
        fullyRefunded: false,
        orderId: order.id,
        previousStatus: order.status,
        reason: "not_fully_refunded",
      };
    }

    if (order.status === "refunded") {
      return {
        matched: true,
        applied: false,
        fullyRefunded: true,
        orderId: order.id,
        previousStatus: order.status,
        reason: "already_refunded",
      };
    }

    await tx.wearOrder.update({
      where: { id: order.id },
      data: {
        status: "refunded",
        refundedAt: order.refunded_at ?? new Date(),
      },
    });

    return {
      matched: true,
      applied: true,
      fullyRefunded: true,
      orderId: order.id,
      previousStatus: order.status,
    };
  });
}
