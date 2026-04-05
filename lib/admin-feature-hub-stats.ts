import type { PrismaClient } from "@prisma/client";

export type FeatureHubRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  currency: string;
  isActive: boolean;
  visibility: string;
  grantByDefault: boolean;
  sortOrder: number;
  billableActivations: number;
  estimatedMrrCents: number;
  /** Share of approved studios with a billable activation for this feature. */
  activationRatePct: number;
};

/**
 * Catalog-wide view for hyperadmin: billable activations and directional MRR per `PlatformFeature`.
 */
export async function featureHubStats(prisma: PrismaClient): Promise<{
  approvedStudioCount: number;
  rows: FeatureHubRow[];
  totalEstimatedMrrCents: number;
  totalBillableActivations: number;
}> {
  const [approvedStudioCount, features, activations] = await Promise.all([
    prisma.studio.count({ where: { status: "approved" } }),
    prisma.platformFeature.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.studioFeatureActivation.findMany({
      where: { status: { in: ["active", "trialing", "pending_cancel"] } },
      select: {
        featureId: true,
        overridePriceCents: true,
        feature: { select: { priceCents: true } },
      },
    }),
  ]);

  const agg = new Map<string, { count: number; mrr: number }>();
  for (const a of activations) {
    const eff = a.overridePriceCents ?? a.feature.priceCents;
    const cur = agg.get(a.featureId) ?? { count: 0, mrr: 0 };
    cur.count += 1;
    cur.mrr += eff;
    agg.set(a.featureId, cur);
  }

  let totalEstimatedMrrCents = 0;
  let totalBillableActivations = 0;

  const rows: FeatureHubRow[] = features.map((f) => {
    const a = agg.get(f.id) ?? { count: 0, mrr: 0 };
    totalEstimatedMrrCents += a.mrr;
    totalBillableActivations += a.count;
    const activationRatePct =
      approvedStudioCount > 0 ? Math.round((a.count / approvedStudioCount) * 1000) / 10 : 0;
    return {
      id: f.id,
      slug: f.slug,
      name: f.name,
      category: f.category,
      priceCents: f.priceCents,
      currency: f.currency,
      isActive: f.isActive,
      visibility: f.visibility,
      grantByDefault: f.grantByDefault,
      sortOrder: f.sortOrder,
      billableActivations: a.count,
      estimatedMrrCents: a.mrr,
      activationRatePct,
    };
  });

  return { approvedStudioCount, rows, totalEstimatedMrrCents, totalBillableActivations };
}

export type FeatureActivationDirectoryRow = {
  activationId: string;
  studioId: string;
  displayName: string;
  city: string;
  country: string;
  studioStatus: string;
  activationStatus: string;
  overridePriceCents: number | null;
  effectivePriceCents: number;
  stripeSubscriptionId: string | null;
  updatedAt: Date;
};

/**
 * All activation rows for one catalog feature (any status), for hyperadmin drill-down → studio detail overrides.
 */
export async function featureActivationDirectory(
  prisma: PrismaClient,
  featureId: string,
): Promise<
  | { ok: false }
  | {
      ok: true;
      feature: { id: string; name: string; slug: string; priceCents: number };
      rows: FeatureActivationDirectoryRow[];
    }
> {
  const feature = await prisma.platformFeature.findUnique({
    where: { id: featureId },
    select: { id: true, name: true, slug: true, priceCents: true },
  });
  if (!feature) return { ok: false };

  const acts = await prisma.studioFeatureActivation.findMany({
    where: { featureId: feature.id },
    include: {
      studio: { select: { id: true, displayName: true, city: true, country: true, status: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const rows: FeatureActivationDirectoryRow[] = acts.map((a) => ({
    activationId: a.id,
    studioId: a.studioId,
    displayName: a.studio.displayName,
    city: a.studio.city,
    country: a.studio.country,
    studioStatus: a.studio.status,
    activationStatus: a.status,
    overridePriceCents: a.overridePriceCents,
    effectivePriceCents: a.overridePriceCents ?? feature.priceCents,
    stripeSubscriptionId: a.stripeSubscriptionId,
    updatedAt: a.updatedAt,
  }));

  return { ok: true, feature, rows };
}
