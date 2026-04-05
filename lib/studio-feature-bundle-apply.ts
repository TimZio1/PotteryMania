import type { PlatformFeature, Studio } from "@prisma/client";
import { prisma } from "@/lib/db";
import { bundleOfferedNow } from "@/lib/studio-feature-bundles-vendor";
import { activationGrantsAccess } from "@/lib/studio-features";
import {
  createStudioBundleSubscriptionCheckout,
  platformBundleRequiresStripeSubscription,
  platformFeatureRequiresStripeSubscription,
} from "@/lib/studio-feature-billing";

export type ApplyBundleResult =
  | { ok: true; alreadyComplete: true }
  | { ok: true; activatedSlugs: string[]; needsIndividualStripeSlugs: string[] }
  | { checkoutUrl: string; bundleSlug: string }
  | { error: string; status: number };

export async function applyStudioFeatureBundle(opts: {
  studioId: string;
  studio: Pick<Studio, "id" | "displayName" | "stripePlatformCustomerId">;
  ownerEmail: string;
  bundleId: string;
}): Promise<ApplyBundleResult> {
  const bundle = await prisma.featureBundle.findUnique({
    where: { id: opts.bundleId },
    include: {
      items: { orderBy: { sortOrder: "asc" }, include: { feature: true } },
    },
  });

  if (!bundle || !bundleOfferedNow(bundle)) {
    return { error: "This bundle is not available right now.", status: 400 };
  }

  const features: PlatformFeature[] = bundle.items
    .map((i) => i.feature)
    .filter((f) => (f.visibility === "public" || f.visibility === "beta") && f.isActive);

  if (features.length === 0) {
    return { error: "This bundle has no add-ons you can enable from here.", status: 400 };
  }

  const activations = await prisma.studioFeatureActivation.findMany({
    where: { studioId: opts.studioId, featureId: { in: features.map((f) => f.id) } },
  });
  const actByFeature = new Map(activations.map((a) => [a.featureId, a]));

  function entitled(f: PlatformFeature) {
    if (f.grantByDefault) return true;
    const a = actByFeature.get(f.id);
    if (!a) return false;
    return activationGrantsAccess(a.status, a.trialEndsAt, a.deactivatesAt);
  }

  if (features.every(entitled)) {
    return { ok: true, alreadyComplete: true };
  }

  if (platformBundleRequiresStripeSubscription(bundle)) {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { error: "Stripe is not configured — bundle checkout is unavailable.", status: 503 };
    }
    try {
      const session = await createStudioBundleSubscriptionCheckout({
        studio: opts.studio,
        ownerEmail: opts.ownerEmail,
        bundle,
        featureIds: features.map((f) => f.id),
      });
      const url = session.url;
      if (!url) return { error: "Could not start checkout", status: 500 };
      return { checkoutUrl: url, bundleSlug: bundle.slug };
    } catch (e) {
      console.error("[applyStudioFeatureBundle] checkout", e);
      return { error: "Could not start bundle checkout", status: 503 };
    }
  }

  const activatedSlugs: string[] = [];
  const needsIndividualStripeSlugs: string[] = [];
  const now = new Date();

  for (const feature of features) {
    if (entitled(feature)) continue;
    if (platformFeatureRequiresStripeSubscription(feature)) {
      needsIndividualStripeSlugs.push(feature.slug);
      continue;
    }
    await prisma.studioFeatureActivation.upsert({
      where: { studioId_featureId: { studioId: opts.studioId, featureId: feature.id } },
      create: {
        studioId: opts.studioId,
        featureId: feature.id,
        status: "active",
        activatedAt: now,
      },
      update: {
        status: "active",
        activatedAt: now,
      },
    });
    await prisma.studioFeatureRequest.upsert({
      where: { studioId_featureKey: { studioId: opts.studioId, featureKey: feature.slug } },
      create: { studioId: opts.studioId, featureKey: feature.slug, desiredOn: true },
      update: { desiredOn: true },
    });
    activatedSlugs.push(feature.slug);
  }

  return {
    ok: true,
    activatedSlugs,
    needsIndividualStripeSlugs,
  };
}
