import type { FeatureBundle, PlatformFeature, Studio, StudioFeatureActivation } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export function platformFeatureRequiresStripeSubscription(
  feature: Pick<PlatformFeature, "isActive" | "grantByDefault" | "stripePriceId">,
) {
  if (!feature.isActive || feature.grantByDefault) return false;
  const id = feature.stripePriceId?.trim();
  return Boolean(id && id.startsWith("price_"));
}

export function platformBundleRequiresStripeSubscription(
  bundle: Pick<FeatureBundle, "isActive" | "stripePriceId">,
) {
  if (!bundle.isActive) return false;
  const id = bundle.stripePriceId?.trim();
  return Boolean(id && id.startsWith("price_"));
}

function billingBaseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function createStudioFeatureSubscriptionCheckout(input: {
  studio: Pick<Studio, "id" | "displayName" | "stripePlatformCustomerId">;
  ownerEmail: string;
  feature: Pick<PlatformFeature, "id" | "slug" | "name" | "stripePriceId">;
}) {
  const priceId = input.feature.stripePriceId?.trim();
  if (!priceId?.startsWith("price_")) {
    throw new Error("Feature has no valid Stripe price id");
  }
  const stripe = getStripe();
  const successUrl = `${billingBaseUrl()}/dashboard/${input.studio.id}/features?stripe_feature=${encodeURIComponent(input.feature.slug)}`;
  const cancelUrl = `${billingBaseUrl()}/dashboard/${input.studio.id}/features?stripe_cancelled=${encodeURIComponent(input.feature.slug)}`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...(input.studio.stripePlatformCustomerId
      ? { customer: input.studio.stripePlatformCustomerId }
      : { customer_email: input.ownerEmail }),
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      type: "studio_feature_subscription",
      studioId: input.studio.id,
      featureId: input.feature.id,
      featureSlug: input.feature.slug,
    },
    subscription_data: {
      metadata: {
        type: "studio_feature_subscription",
        studioId: input.studio.id,
        featureId: input.feature.id,
        featureSlug: input.feature.slug,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

export async function createStudioBundleSubscriptionCheckout(input: {
  studio: Pick<Studio, "id" | "displayName" | "stripePlatformCustomerId">;
  ownerEmail: string;
  bundle: Pick<FeatureBundle, "id" | "slug" | "name" | "stripePriceId">;
  featureIds: string[];
}) {
  const priceId = input.bundle.stripePriceId?.trim();
  if (!priceId?.startsWith("price_")) {
    throw new Error("Bundle has no valid Stripe price id");
  }
  if (!input.featureIds.length) {
    throw new Error("Bundle has no features");
  }
  const stripe = getStripe();
  const successUrl = `${billingBaseUrl()}/dashboard/${input.studio.id}/features?stripe_bundle=${encodeURIComponent(input.bundle.slug)}`;
  const cancelUrl = `${billingBaseUrl()}/dashboard/${input.studio.id}/features?stripe_cancelled_bundle=${encodeURIComponent(input.bundle.slug)}`;
  const featureIdsCsv = input.featureIds.join(",");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...(input.studio.stripePlatformCustomerId
      ? { customer: input.studio.stripePlatformCustomerId }
      : { customer_email: input.ownerEmail }),
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      type: "studio_feature_bundle",
      studioId: input.studio.id,
      bundleId: input.bundle.id,
      bundleSlug: input.bundle.slug,
      featureIds: featureIdsCsv,
    },
    subscription_data: {
      metadata: {
        type: "studio_feature_bundle",
        studioId: input.studio.id,
        bundleId: input.bundle.id,
        bundleSlug: input.bundle.slug,
        featureIds: featureIdsCsv,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

/** Stripe already ended the subscription — sync DB for every activation row pointing at it. */
export async function markActivationsEndedForStripeSubscription(subscriptionId: string) {
  const subId = subscriptionId.trim();
  if (!subId) return;
  const acts = await prisma.studioFeatureActivation.findMany({
    where: { stripeSubscriptionId: subId },
    select: { studioId: true, featureId: true },
  });
  if (!acts.length) return;
  await prisma.studioFeatureActivation.updateMany({
    where: { stripeSubscriptionId: subId },
    data: {
      status: "inactive",
      stripeSubscriptionId: null,
      activatedAt: null,
      deactivatesAt: null,
      trialEndsAt: null,
      stripeSubscriptionItemId: null,
    },
  });
  const featureIds = [...new Set(acts.map((a) => a.featureId))];
  const features = await prisma.platformFeature.findMany({
    where: { id: { in: featureIds } },
    select: { id: true, slug: true },
  });
  const slugById = Object.fromEntries(features.map((f) => [f.id, f.slug]));
  for (const a of acts) {
    const slug = slugById[a.featureId];
    if (!slug) continue;
    await prisma.studioFeatureRequest.upsert({
      where: { studioId_featureKey: { studioId: a.studioId, featureKey: slug } },
      create: { studioId: a.studioId, featureKey: slug, desiredOn: false },
      update: { desiredOn: false },
    });
  }
}

/** Cancel a platform add-on subscription and clear every studio activation row that shares this subscription id. */
export async function cancelStudioFeatureStripeSubscription(
  activation: Pick<StudioFeatureActivation, "studioId" | "stripeSubscriptionId">,
) {
  const subId = activation.stripeSubscriptionId?.trim();
  if (!subId) return;
  try {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(subId);
  } catch (e) {
    console.error("[studio-feature-billing] cancel subscription", e);
  }
  await markActivationsEndedForStripeSubscription(subId);
}
