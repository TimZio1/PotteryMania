import type { PlatformFeature } from "@prisma/client";
import { prisma } from "@/lib/db";
import { activationGrantsAccess } from "@/lib/studio-features";
import { platformBundleRequiresStripeSubscription, platformFeatureRequiresStripeSubscription } from "@/lib/studio-feature-billing";

export function bundleOfferedNow(bundle: {
  isActive: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
}) {
  if (!bundle.isActive) return false;
  const now = new Date();
  if (bundle.validFrom && bundle.validFrom > now) return false;
  if (bundle.validUntil && bundle.validUntil < now) return false;
  return true;
}

export type StudioVendorBundleRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  listSumCents: number;
  requiresBundleStripe: boolean;
  featureSlugs: string[];
  featureNames: string[];
  /** Every catalog feature in the bundle is effectively entitled (access on). */
  allEntitled: boolean;
  /** At least one feature still needs activation (not entitled). */
  hasGaps: boolean;
  /** Slugs that need individual Stripe checkout (no bundle Stripe price on platform). */
  needsIndividualStripeSlugs: string[];
};

function featureVisibleToStudio(f: Pick<PlatformFeature, "visibility">) {
  return f.visibility === "public" || f.visibility === "beta";
}

export async function listStudioBundlesForVendor(studioId: string): Promise<StudioVendorBundleRow[]> {
  const bundles = await prisma.featureBundle.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { feature: true },
      },
    },
  });

  const rows: StudioVendorBundleRow[] = [];

  for (const b of bundles) {
    if (!bundleOfferedNow(b)) continue;

    const visibleItems = b.items.filter((it) => featureVisibleToStudio(it.feature) && it.feature.isActive);
    if (visibleItems.length === 0) continue;

    const features = visibleItems.map((it) => it.feature);
    const listSumCents = features.reduce((s, f) => s + f.priceCents, 0);
    const requiresBundleStripe = platformBundleRequiresStripeSubscription(b);

    const activations = await prisma.studioFeatureActivation.findMany({
      where: {
        studioId,
        featureId: { in: features.map((f) => f.id) },
      },
    });
    const actByFeature = new Map(activations.map((a) => [a.featureId, a]));

    const needsIndividualStripeSlugs: string[] = [];
    let allEntitled = true;

    for (const f of features) {
      const act = actByFeature.get(f.id);
      const entitled =
        f.grantByDefault ||
        (act ? activationGrantsAccess(act.status, act.trialEndsAt, act.deactivatesAt) : false);
      if (!entitled) allEntitled = false;
      if (!entitled && platformFeatureRequiresStripeSubscription(f) && !requiresBundleStripe) {
        needsIndividualStripeSlugs.push(f.slug);
      }
    }

    rows.push({
      id: b.id,
      slug: b.slug,
      name: b.name,
      description: b.description,
      priceCents: b.priceCents,
      currency: b.currency,
      listSumCents,
      requiresBundleStripe,
      featureSlugs: features.map((f) => f.slug),
      featureNames: features.map((f) => f.name),
      allEntitled,
      hasGaps: !allEntitled,
      needsIndividualStripeSlugs,
    });
  }

  return rows;
}
