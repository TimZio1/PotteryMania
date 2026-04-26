import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { logApiError } from "@/lib/monitoring";

export const AFFILIATE_PAYOUT_THRESHOLD_CENTS = 5000;

type PendingCreditRow = {
  id: string;
  amount_cents: number;
};

function normalizeCurrency(currency: string | null | undefined) {
  return (currency || "EUR").toUpperCase();
}

export async function recordWearAffiliateCommissionAndMaybePayout(wearOrderId: string) {
  const order = await prisma.wearOrder.findUnique({
    where: { id: wearOrderId },
    select: {
      id: true,
      status: true,
      studioId: true,
      studioMarginCents: true,
      currency: true,
      stripePaymentIntentId: true,
    },
  });

  if (
    !order ||
    order.status !== "paid" ||
    !order.studioId ||
    !order.studioMarginCents ||
    order.studioMarginCents <= 0
  ) {
    return { credited: false, payoutCreated: false };
  }

  const currency = normalizeCurrency(order.currency);

  await prisma.affiliateCommissionCredit.upsert({
    where: { wearOrderId },
    create: {
      studioId: order.studioId,
      wearOrderId: order.id,
      amountCents: order.studioMarginCents,
      currency,
      sourceStripePaymentId: order.stripePaymentIntentId,
    },
    update: {},
  });

  return attemptWearAffiliatePayoutForStudio({
    studioId: order.studioId,
    currency,
    sourceWearOrderId: wearOrderId,
    credited: true,
  });
}

export async function attemptWearAffiliatePayoutForStudio(input: {
  studioId: string;
  currency?: string | null;
  sourceWearOrderId?: string;
  credited?: boolean;
}) {
  const currency = normalizeCurrency(input.currency);
  const stripeAccount = await prisma.stripeAccount.findUnique({
    where: { studioId: input.studioId },
    select: {
      stripeAccountId: true,
      onboardingStatus: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    },
  });

  if (!stripeAccount?.stripeAccountId || !stripeAccount.payoutsEnabled || !stripeAccount.detailsSubmitted) {
    return { credited: input.credited ?? false, payoutCreated: false, reason: "stripe_account_not_payout_ready" };
  }

  const payoutPlan = await prisma.$transaction(async (tx) => {
    const lockedCredits = await tx.$queryRaw<PendingCreditRow[]>(
      Prisma.sql`
        SELECT id, amount_cents
        FROM affiliate_commission_credits
        WHERE studio_id = ${input.studioId}::uuid
          AND currency = ${currency}
          AND status = 'pending'
        ORDER BY credited_at ASC, id ASC
        FOR UPDATE
      `,
    );

    const totalCents = lockedCredits.reduce((sum, row) => sum + row.amount_cents, 0);
    if (totalCents < AFFILIATE_PAYOUT_THRESHOLD_CENTS) return null;

    const payout = await tx.affiliatePayout.create({
      data: {
        studioId: input.studioId,
        amountCents: totalCents,
        currency,
        status: "pending",
        stripeAccountId: stripeAccount.stripeAccountId,
      },
      select: { id: true, amountCents: true, currency: true, stripeAccountId: true },
    });

    await tx.affiliateCommissionCredit.updateMany({
      where: { id: { in: lockedCredits.map((row) => row.id) } },
      data: { payoutId: payout.id, status: "payout_pending" },
    });

    return payout;
  });

  if (!payoutPlan) {
    return { credited: input.credited ?? false, payoutCreated: false, reason: "below_threshold" };
  }

  try {
    const transfer = await getStripe().transfers.create(
      {
        amount: payoutPlan.amountCents,
        currency: payoutPlan.currency.toLowerCase(),
        destination: payoutPlan.stripeAccountId,
        metadata: {
          type: "wear_affiliate_commission_payout",
          affiliateStudioId: input.studioId,
          affiliatePayoutId: payoutPlan.id,
          ...(input.sourceWearOrderId ? { wearOrderId: input.sourceWearOrderId } : {}),
        },
      },
      { idempotencyKey: `wear_affiliate_payout_${payoutPlan.id}` },
    );

    const paidAt = new Date();
    await prisma.$transaction([
      prisma.affiliatePayout.update({
        where: { id: payoutPlan.id },
        data: {
          status: "paid",
          stripeTransferId: transfer.id,
          paidAt,
        },
      }),
      prisma.affiliateCommissionCredit.updateMany({
        where: { payoutId: payoutPlan.id },
        data: { status: "paid", paidAt },
      }),
    ]);

    return {
      credited: input.credited ?? false,
      payoutCreated: true,
      payoutId: payoutPlan.id,
      stripeTransferId: transfer.id,
    };
  } catch (error) {
    logApiError("wear_affiliate_payout_transfer", error, {
      payoutId: payoutPlan.id,
      affiliateStudioId: input.studioId,
    });

    await prisma.$transaction([
      prisma.affiliatePayout.update({
        where: { id: payoutPlan.id },
        data: {
          status: "failed",
          failureReason: error instanceof Error ? error.message.slice(0, 2000) : "Stripe transfer failed",
        },
      }),
      prisma.affiliateCommissionCredit.updateMany({
        where: { payoutId: payoutPlan.id },
        data: { status: "pending", payoutId: null },
      }),
    ]);

    return { credited: input.credited ?? false, payoutCreated: false, reason: "transfer_failed" };
  }
}
