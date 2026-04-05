import type { FeatureBundle, FeatureBundleItem, PlatformFeature } from "@prisma/client";

export type BundleWithItems = FeatureBundle & {
  items: (FeatureBundleItem & { feature: PlatformFeature })[];
};

export function featureBundleToDto(b: BundleWithItems) {
  const listSumCents = b.items.reduce((s, i) => s + i.feature.priceCents, 0);
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description,
    priceCents: b.priceCents,
    currency: b.currency,
    isActive: b.isActive,
    sortOrder: b.sortOrder,
    validFrom: b.validFrom?.toISOString() ?? null,
    validUntil: b.validUntil?.toISOString() ?? null,
    stripePriceId: b.stripePriceId ?? null,
    updatedAt: b.updatedAt.toISOString(),
    listSumCents,
    items: b.items.map((i) => ({
      id: i.id,
      sortOrder: i.sortOrder,
      featureId: i.feature.id,
      featureSlug: i.feature.slug,
      featureName: i.feature.name,
      featurePriceCents: i.feature.priceCents,
      featureCurrency: i.feature.currency,
    })),
  };
}
