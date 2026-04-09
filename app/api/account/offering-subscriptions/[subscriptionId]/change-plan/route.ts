import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { recordOfferingSubscriptionEvent } from "@/lib/offering-subscriptions";
import { isOfferingBillingInterval } from "@/lib/offering-pricing";
import { computeLaunchAwareSubscriptionTrial } from "@/lib/subscription-launch";

type Ctx = { params: Promise<{ subscriptionId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subscriptionId } = await ctx.params;

  const current = await prisma.offeringSubscription.findUnique({ where: { id: subscriptionId } });
  if (!current || current.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!current.stripeSubscriptionId) {
    return NextResponse.json({ error: "External subscription link missing." }, { status: 409 });
  }

  let body: { offeringType?: string; offeringId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const offeringType = typeof body.offeringType === "string" ? body.offeringType : "";
  const offeringId = typeof body.offeringId === "string" ? body.offeringId : "";
  if (!offeringId || (offeringType !== "product" && offeringType !== "experience")) {
    return NextResponse.json({ error: "offeringType and offeringId required." }, { status: 400 });
  }

  let next:
    | {
        targetType: "product" | "experience";
        studioId: string;
        productId: string | null;
        experienceId: string | null;
        recurringPriceCents: number;
        billingInterval: "weekly" | "monthly" | "custom";
        billingIntervalCount: number;
        minimumCommitmentCycles: number | null;
        paymentRetryMax: number;
        gracePeriodDays: number;
        failedPaymentAction: "pause" | "cancel";
        pricingVersion: number;
      }
    | null = null;

  if (offeringType === "product") {
    const product = await prisma.product.findFirst({
      where: { id: offeringId, pricingType: "recurring", status: "active" },
    });
    if (!product || product.recurringPriceCents == null || !product.billingInterval || !isOfferingBillingInterval(product.billingInterval)) {
      return NextResponse.json({ error: "Recurring offering unavailable." }, { status: 404 });
    }
    next = {
      targetType: "product",
      studioId: product.studioId,
      productId: product.id,
      experienceId: null,
      recurringPriceCents: product.recurringPriceCents,
      billingInterval: product.billingInterval,
      billingIntervalCount: Math.max(1, product.billingIntervalCount ?? 1),
      minimumCommitmentCycles: product.minimumCommitmentCycles,
      paymentRetryMax: product.paymentRetryMax,
      gracePeriodDays: product.gracePeriodDays,
      failedPaymentAction: product.failedPaymentAction,
      pricingVersion: product.pricingVersion,
    };
  } else {
    const experience = await prisma.experience.findFirst({
      where: { id: offeringId, pricingType: "recurring", status: "active", visibility: "public" },
    });
    if (
      !experience ||
      experience.recurringPriceCents == null ||
      !experience.billingInterval ||
      !isOfferingBillingInterval(experience.billingInterval)
    ) {
      return NextResponse.json({ error: "Recurring offering unavailable." }, { status: 404 });
    }
    next = {
      targetType: "experience",
      studioId: experience.studioId,
      productId: null,
      experienceId: experience.id,
      recurringPriceCents: experience.recurringPriceCents,
      billingInterval: experience.billingInterval,
      billingIntervalCount: Math.max(1, experience.billingIntervalCount ?? 1),
      minimumCommitmentCycles: experience.minimumCommitmentCycles,
      paymentRetryMax: experience.paymentRetryMax,
      gracePeriodDays: experience.gracePeriodDays,
      failedPaymentAction: experience.failedPaymentAction,
      pricingVersion: experience.pricingVersion,
    };
  }

  // Safe plan change strategy:
  // 1) schedule current subscription to end at period boundary
  // 2) start a new Stripe checkout session for the target plan
  await getStripe().subscriptions.update(current.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
  const periodEnd = current.currentPeriodEnd ?? current.nextBillingDate ?? new Date();
  await prisma.offeringSubscription.update({
    where: { id: current.id },
    data: {
      status: "pending_cancel",
      autoRenew: false,
      cancelAtPeriodEnd: true,
      nextBillingDate: periodEnd,
    },
  });
  await recordOfferingSubscriptionEvent(current.id, "plan_changed", {
    strategy: "schedule_cancel_then_new_checkout",
    previousStripeSubscriptionId: current.stripeSubscriptionId,
    toType: next.targetType,
    toProductId: next.productId,
    toExperienceId: next.experienceId,
  });

  const stripeInterval = next.billingInterval === "weekly" ? "week" : "month";
  const launchAwareTrial = computeLaunchAwareSubscriptionTrial({ trialPeriodDays: 0 });
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: next.recurringPriceCents,
          recurring: { interval: stripeInterval, interval_count: next.billingIntervalCount },
          product_data: {
            name: next.targetType === "product" ? "Product subscription" : "Class membership",
          },
        },
      },
    ],
    metadata: {
      type: "offering_subscription",
      targetType: next.targetType,
      productId: next.productId ?? "",
      experienceId: next.experienceId ?? "",
      studioId: next.studioId,
      userId: user.id,
      priceSnapshotCents: String(next.recurringPriceCents),
      billingInterval: next.billingInterval,
      billingIntervalCount: String(next.billingIntervalCount),
      minimumCommitmentCycles: String(next.minimumCommitmentCycles ?? 0),
      autoRenew: "1",
      trialPeriodDays: "0",
      gracePeriodDays: String(next.gracePeriodDays),
      paymentRetryMax: String(next.paymentRetryMax),
      failedPaymentAction: next.failedPaymentAction,
      pricingVersion: String(next.pricingVersion),
      previousOfferingSubscriptionId: current.id,
    },
    ...(Object.keys(launchAwareTrial).length > 0 ? { subscription_data: launchAwareTrial } : {}),
    success_url: `${process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/account?plan_changed=1`,
    cancel_url: `${process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/account?plan_change_cancelled=1`,
  });

  return NextResponse.json({ ok: true, checkoutUrl: session.url });
}
