import type { PrismaClient } from "@prisma/client";

export type PlanMrrRow = {
  planId: string;
  planName: string;
  interval: string;
  subscriberCount: number;
  priceCents: number;
  mrrCents: number;
};

export function aggregatePlanSubscriptionRows(
  subscriptions: Array<{
    planId: string;
    plan: { name: string; interval: string; priceCents: number };
  }>,
): PlanMrrRow[] {
  const map = new Map<
    string,
    { planName: string; interval: string; priceCents: number; subscriberCount: number; mrrCents: number }
  >();
  for (const s of subscriptions) {
    const add = s.plan.interval === "month" ? s.plan.priceCents : Math.round(s.plan.priceCents / 12);
    const cur = map.get(s.planId);
    if (!cur) {
      map.set(s.planId, {
        planName: s.plan.name,
        interval: s.plan.interval,
        priceCents: s.plan.priceCents,
        subscriberCount: 1,
        mrrCents: add,
      });
    } else {
      map.set(s.planId, {
        ...cur,
        subscriberCount: cur.subscriberCount + 1,
        mrrCents: cur.mrrCents + add,
      });
    }
  }
  return [...map.entries()]
    .map(([planId, v]) => ({ planId, ...v }))
    .sort((a, b) => b.mrrCents - a.mrrCents);
}

export type FeatureAddonMrrRow = {
  featureId: string;
  name: string;
  slug: string;
  billableActivations: number;
  estimatedMrrCents: number;
  catalogPriceCents: number;
};

/**
 * Sums effective price (override or catalog) per activation for active-ish statuses.
 * Treats catalog `priceCents` as a monthly estimate when Stripe item interval differs.
 */
export async function featureAddonMrrRows(prisma: PrismaClient): Promise<FeatureAddonMrrRow[]> {
  const rows = await prisma.studioFeatureActivation.findMany({
    where: { status: { in: ["active", "trialing", "pending_cancel"] } },
    select: {
      overridePriceCents: true,
      feature: { select: { id: true, name: true, slug: true, priceCents: true } },
    },
  });
  const map = new Map<
    string,
    {
      name: string;
      slug: string;
      catalogPriceCents: number;
      billableActivations: number;
      estimatedMrrCents: number;
    }
  >();
  for (const r of rows) {
    const eff = r.overridePriceCents ?? r.feature.priceCents;
    const cur = map.get(r.feature.id);
    if (!cur) {
      map.set(r.feature.id, {
        name: r.feature.name,
        slug: r.feature.slug,
        catalogPriceCents: r.feature.priceCents,
        billableActivations: 1,
        estimatedMrrCents: eff,
      });
    } else {
      map.set(r.feature.id, {
        ...cur,
        billableActivations: cur.billableActivations + 1,
        estimatedMrrCents: cur.estimatedMrrCents + eff,
      });
    }
  }
  return [...map.entries()]
    .map(([featureId, v]) => ({
      featureId,
      name: v.name,
      slug: v.slug,
      catalogPriceCents: v.catalogPriceCents,
      billableActivations: v.billableActivations,
      estimatedMrrCents: v.estimatedMrrCents,
    }))
    .sort((a, b) => b.estimatedMrrCents - a.estimatedMrrCents);
}
