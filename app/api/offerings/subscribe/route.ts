import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { isOfferingBillingInterval } from "@/lib/offering-pricing";
import { computeLaunchAwareSubscriptionTrial } from "@/lib/subscription-launch";

function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { offeringType?: string; offeringId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const offeringType = typeof body.offeringType === "string" ? body.offeringType : "";
  const offeringId = typeof body.offeringId === "string" ? body.offeringId : "";
  if (!offeringId || (offeringType !== "product" && offeringType !== "experience")) {
    return NextResponse.json({ error: "offeringType (product|experience) and offeringId required." }, { status: 400 });
  }
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  }

  if (offeringType === "product") {
    const product = await prisma.product.findFirst({
      where: {
        id: offeringId,
        status: "active",
        pricingType: "recurring",
        studio: {
          status: "approved",
          stripeAccount: { is: { chargesEnabled: true, payoutsEnabled: true } },
        },
      },
      include: { studio: { select: { displayName: true } } },
    });
    if (!product || product.recurringPriceCents == null || !product.billingInterval) {
      return NextResponse.json({ error: "Recurring product offering unavailable." }, { status: 404 });
    }
    if (!isOfferingBillingInterval(product.billingInterval)) {
      return NextResponse.json({ error: "Invalid billing interval configuration." }, { status: 400 });
    }
    const intervalCount = Math.max(1, product.billingIntervalCount ?? 1);
    const stripeInterval = product.billingInterval === "weekly" ? "week" : "month";
    const launchAwareTrial = computeLaunchAwareSubscriptionTrial({
      trialPeriodDays: product.trialPeriodDays,
    });
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: product.recurringPriceCents,
            recurring: { interval: stripeInterval, interval_count: intervalCount },
            product_data: {
              name: `${product.title} subscription`,
              description: `Recurring studio product from ${product.studio.displayName}.`,
            },
          },
        },
      ],
      ...(Object.keys(launchAwareTrial).length > 0 ? { subscription_data: launchAwareTrial } : {}),
      metadata: {
        type: "offering_subscription",
        targetType: "product",
        productId: product.id,
        studioId: product.studioId,
        userId: user.id,
        priceSnapshotCents: String(product.recurringPriceCents),
        billingInterval: product.billingInterval,
        billingIntervalCount: String(intervalCount),
        minimumCommitmentCycles: String(product.minimumCommitmentCycles ?? 0),
        autoRenew: product.autoRenew ? "1" : "0",
        trialPeriodDays: String(product.trialPeriodDays ?? 0),
        gracePeriodDays: String(product.gracePeriodDays),
        paymentRetryMax: String(product.paymentRetryMax),
        failedPaymentAction: product.failedPaymentAction,
        pricingVersion: String(product.pricingVersion),
      },
      success_url: `${baseUrl()}/account?offering_subscribed=1`,
      cancel_url: `${baseUrl()}/marketplace/products/${product.id}?subscribe_cancelled=1`,
    });
    return NextResponse.json({ checkoutUrl: session.url });
  }

  const experience = await prisma.experience.findFirst({
    where: {
      id: offeringId,
      status: "active",
      visibility: "public",
      pricingType: "recurring",
      studio: {
        status: "approved",
        stripeAccount: { is: { chargesEnabled: true, payoutsEnabled: true } },
      },
    },
    include: { studio: { select: { displayName: true } } },
  });
  if (!experience || experience.recurringPriceCents == null || !experience.billingInterval) {
    return NextResponse.json({ error: "Recurring class offering unavailable." }, { status: 404 });
  }
  if (!isOfferingBillingInterval(experience.billingInterval)) {
    return NextResponse.json({ error: "Invalid billing interval configuration." }, { status: 400 });
  }
  const intervalCount = Math.max(1, experience.billingIntervalCount ?? 1);
  const stripeInterval = experience.billingInterval === "weekly" ? "week" : "month";
  const launchAwareTrial = computeLaunchAwareSubscriptionTrial({
    trialPeriodDays: experience.trialPeriodDays,
  });
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: experience.recurringPriceCents,
          recurring: { interval: stripeInterval, interval_count: intervalCount },
          product_data: {
            name: `${experience.title} membership`,
            description: `Recurring class/membership from ${experience.studio.displayName}.`,
          },
        },
      },
    ],
    ...(Object.keys(launchAwareTrial).length > 0 ? { subscription_data: launchAwareTrial } : {}),
    metadata: {
      type: "offering_subscription",
      targetType: "experience",
      experienceId: experience.id,
      studioId: experience.studioId,
      userId: user.id,
      priceSnapshotCents: String(experience.recurringPriceCents),
      billingInterval: experience.billingInterval,
      billingIntervalCount: String(intervalCount),
      minimumCommitmentCycles: String(experience.minimumCommitmentCycles ?? 0),
      autoRenew: experience.autoRenew ? "1" : "0",
      trialPeriodDays: String(experience.trialPeriodDays ?? 0),
      gracePeriodDays: String(experience.gracePeriodDays),
      paymentRetryMax: String(experience.paymentRetryMax),
      failedPaymentAction: experience.failedPaymentAction,
      pricingVersion: String(experience.pricingVersion),
    },
    success_url: `${baseUrl()}/account?offering_subscribed=1`,
    cancel_url: `${baseUrl()}/classes/${experience.id}?subscribe_cancelled=1`,
  });
  return NextResponse.json({ checkoutUrl: session.url });
}
