import type {
  FeatureBundle,
  PlatformFeature,
  Studio,
  StudioFeatureActivation,
  StudioFeatureActivationEventKind,
} from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { recordStudioFeatureActivationEvent } from "@/lib/studio-feature-activation-events";
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
  for (const a of acts) {
    await recordStudioFeatureActivationEvent(prisma, {
      studioId: a.studioId,
      featureId: a.featureId,
      kind: "stripe_subscription_ended",
      stripeSubscriptionId: subId,
    });
  }
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

/** Sync `studio_feature_request.desired_on` for every catalog feature tied to this subscription row (bundle-safe). */
export async function setStudioFeatureRequestsDesiredForSubscription(input: {
  studioId: string;
  subscriptionId: string;
  desiredOn: boolean;
}) {
  const subId = input.subscriptionId.trim();
  if (!subId) return;
  const acts = await prisma.studioFeatureActivation.findMany({
    where: { studioId: input.studioId, stripeSubscriptionId: subId },
    select: { featureId: true },
  });
  const ids = [...new Set(acts.map((a) => a.featureId))];
  if (!ids.length) return;
  const feats = await prisma.platformFeature.findMany({
    where: { id: { in: ids } },
    select: { slug: true },
  });
  for (const { slug } of feats) {
    await prisma.studioFeatureRequest.upsert({
      where: { studioId_featureKey: { studioId: input.studioId, featureKey: slug } },
      create: { studioId: input.studioId, featureKey: slug, desiredOn: input.desiredOn },
      update: { desiredOn: input.desiredOn },
    });
  }
}

function isStudioBillingSubscription(sub: Stripe.Subscription) {
  const t = sub.metadata?.type;
  return t === "studio_feature_subscription" || t === "studio_feature_bundle";
}

/** Stripe REST still returns `current_period_end` on Subscription; SDK types may expose it only on items. */
function subscriptionBillingPeriodEndUnix(sub: Stripe.Subscription): number | null {
  const top = sub as unknown as { current_period_end?: number };
  if (typeof top.current_period_end === "number") return top.current_period_end;
  const first = sub.items?.data?.[0];
  if (first && typeof first.current_period_end === "number") return first.current_period_end;
  return null;
}

/**
 * Stripe cancel at period end — keeps access until `current_period_end` (pending_cancel + deactivatesAt).
 * All activation rows sharing this subscription id are updated (bundle case).
 */
export async function scheduleStudioFeatureSubscriptionCancelAtPeriodEnd(
  subscriptionId: string,
  opts?: {
    /** Defaults to vendor; use admin when hyperadmin schedules cancel from studio detail. */
    scheduleEventKind?: Extract<
      StudioFeatureActivationEventKind,
      "vendor_cancel_at_period_end" | "admin_cancel_at_period_end"
    >;
  },
) {
  const scheduleEventKind = opts?.scheduleEventKind ?? "vendor_cancel_at_period_end";
  const subId = subscriptionId.trim();
  if (!subId) return { ok: false as const, error: "missing_subscription_id" };
  const stripe = getStripe();
  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data"] });
  } catch (e) {
    console.error("[studio-feature-billing] retrieve subscription", e);
    return { ok: false as const, error: "stripe_retrieve_failed" };
  }
  if (!isStudioBillingSubscription(sub)) {
    return { ok: false as const, error: "not_studio_billing_subscription" };
  }
  try {
    sub = await stripe.subscriptions.update(subId, { cancel_at_period_end: true, expand: ["items.data"] });
  } catch (e) {
    console.error("[studio-feature-billing] schedule cancel at period end", e);
    return { ok: false as const, error: "stripe_update_failed" };
  }
  const periodEndSec = subscriptionBillingPeriodEndUnix(sub);
  if (periodEndSec == null) {
    return { ok: false as const, error: "missing_period_end" };
  }
  const periodEnd = new Date(periodEndSec * 1000);
  const acts = await prisma.studioFeatureActivation.findMany({
    where: { stripeSubscriptionId: subId },
    select: { studioId: true, featureId: true },
  });
  await prisma.studioFeatureActivation.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: "pending_cancel", deactivatesAt: periodEnd },
  });
  for (const a of acts) {
    await recordStudioFeatureActivationEvent(prisma, {
      studioId: a.studioId,
      featureId: a.featureId,
      kind: scheduleEventKind,
      stripeSubscriptionId: subId,
      payload: { currentPeriodEnd: periodEnd.toISOString() },
    });
  }
  return { ok: true as const, periodEnd };
}

/** Undo cancel_at_period_end before the period ends. */
export async function resumeStudioFeatureStripeSubscription(subscriptionId: string) {
  const subId = subscriptionId.trim();
  if (!subId) return { ok: false as const, error: "missing_subscription_id" };
  const stripe = getStripe();
  try {
    const sub = await stripe.subscriptions.retrieve(subId);
    if (!isStudioBillingSubscription(sub)) {
      return { ok: false as const, error: "not_studio_billing_subscription" };
    }
    await stripe.subscriptions.update(subId, { cancel_at_period_end: false });
  } catch (e) {
    console.error("[studio-feature-billing] resume subscription", e);
    return { ok: false as const, error: "stripe_update_failed" };
  }
  await prisma.studioFeatureActivation.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: "active", deactivatesAt: null },
  });
  return { ok: true as const };
}

/** Sync DB rows from Stripe when cancel_at_period_end or period changes (portal, retries). */
export async function syncStudioBillingSubscriptionFromStripe(sub: Stripe.Subscription) {
  const subId = sub.id?.trim();
  if (!subId || !isStudioBillingSubscription(sub)) return;
  const exists = await prisma.studioFeatureActivation.count({ where: { stripeSubscriptionId: subId } });
  if (!exists) return;
  const periodEndSec = subscriptionBillingPeriodEndUnix(sub);
  const periodEnd = periodEndSec != null ? new Date(periodEndSec * 1000) : null;
  if (sub.cancel_at_period_end && periodEnd) {
    await prisma.studioFeatureActivation.updateMany({
      where: { stripeSubscriptionId: subId },
      data: { status: "pending_cancel", deactivatesAt: periodEnd },
    });
    return;
  }
  await prisma.studioFeatureActivation.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: "active", deactivatesAt: null },
  });
}
