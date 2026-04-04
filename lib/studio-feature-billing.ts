import type { PlatformFeature, Studio, StudioFeatureActivation } from "@prisma/client";
import { getStripe } from "@/lib/stripe";

export function platformFeatureRequiresStripeSubscription(feature: Pick<PlatformFeature, "isActive" | "grantByDefault" | "stripePriceId">) {
  if (!feature.isActive || feature.grantByDefault) return false;
  const id = feature.stripePriceId?.trim();
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

export async function cancelStudioFeatureStripeSubscription(activation: Pick<StudioFeatureActivation, "stripeSubscriptionId">) {
  const subId = activation.stripeSubscriptionId?.trim();
  if (!subId) return;
  try {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(subId);
  } catch (e) {
    console.error("[studio-feature-billing] cancel subscription", e);
  }
}
