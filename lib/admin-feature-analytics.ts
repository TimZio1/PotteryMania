import type { PrismaClient, StudioFeatureActivationStatus } from "@prisma/client";

const BILLABLE: StudioFeatureActivationStatus[] = ["active", "trialing", "pending_cancel"];

export type FeatureAnalyticsRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  isActive: boolean;
  visibility: string;
  /** Every StudioFeatureActivation row for this catalog feature. */
  totalRows: number;
  active: number;
  inactive: number;
  trialing: number;
  pendingCancel: number;
  /** Rows with a Stripe subscription id (paid path or bundle). */
  withStripeSubscription: number;
  billableActivations: number;
  estimatedMrrCents: number;
  activationRatePct: number;
  /** Inactive rows updated in the rolling window (preference / churn signal). */
  inactiveRecentCount: number;
};

export type FeatureAnalyticsSnapshot = {
  approvedStudioCount: number;
  inactiveWindowDays: number;
  rows: FeatureAnalyticsRow[];
  totals: {
    totalActivationRows: number;
    totalStripeBacked: number;
    totalInactiveRecent: number;
    totalBillable: number;
    totalEstimatedMrrCents: number;
  };
};

/**
 * Hyperadmin P2-G v1: per-feature activation status mix, Stripe-backed count, billable MRR (same basis as hub),
 * and “recently set inactive” as a directional churn / offboarding proxy (no historical cohorts).
 */
export async function featureAnalyticsSnapshot(
  prisma: PrismaClient,
  opts?: { inactiveWindowDays?: number },
): Promise<FeatureAnalyticsSnapshot> {
  const inactiveWindowDays = opts?.inactiveWindowDays ?? 30;
  const windowStart = new Date();
  windowStart.setUTCDate(windowStart.getUTCDate() - inactiveWindowDays);

  const [approvedStudioCount, features, activations] = await Promise.all([
    prisma.studio.count({ where: { status: "approved" } }),
    prisma.platformFeature.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.studioFeatureActivation.findMany({
      select: {
        featureId: true,
        status: true,
        stripeSubscriptionId: true,
        overridePriceCents: true,
        updatedAt: true,
        feature: { select: { priceCents: true } },
      },
    }),
  ]);

  type Agg = {
    totalRows: number;
    active: number;
    inactive: number;
    trialing: number;
    pendingCancel: number;
    withStripe: number;
    billable: number;
    mrr: number;
    inactiveRecent: number;
  };

  const empty = (): Agg => ({
    totalRows: 0,
    active: 0,
    inactive: 0,
    trialing: 0,
    pendingCancel: 0,
    withStripe: 0,
    billable: 0,
    mrr: 0,
    inactiveRecent: 0,
  });

  const byFeature = new Map<string, Agg>();

  for (const a of activations) {
    const g = byFeature.get(a.featureId) ?? empty();
    g.totalRows += 1;
    if (a.stripeSubscriptionId?.trim()) g.withStripe += 1;
    if (a.status === "active") g.active += 1;
    else if (a.status === "inactive") {
      g.inactive += 1;
      if (a.updatedAt >= windowStart) g.inactiveRecent += 1;
    } else if (a.status === "trialing") g.trialing += 1;
    else if (a.status === "pending_cancel") g.pendingCancel += 1;

    if (BILLABLE.includes(a.status)) {
      g.billable += 1;
      g.mrr += a.overridePriceCents ?? a.feature.priceCents;
    }
    byFeature.set(a.featureId, g);
  }

  let totalActivationRows = 0;
  let totalStripeBacked = 0;
  let totalInactiveRecent = 0;
  let totalBillable = 0;
  let totalEstimatedMrrCents = 0;

  const rows: FeatureAnalyticsRow[] = features.map((f) => {
    const g = byFeature.get(f.id) ?? empty();
    totalActivationRows += g.totalRows;
    totalStripeBacked += g.withStripe;
    totalInactiveRecent += g.inactiveRecent;
    totalBillable += g.billable;
    totalEstimatedMrrCents += g.mrr;

    const activationRatePct =
      approvedStudioCount > 0 ? Math.round((g.billable / approvedStudioCount) * 1000) / 10 : 0;

    return {
      id: f.id,
      slug: f.slug,
      name: f.name,
      category: f.category,
      isActive: f.isActive,
      visibility: f.visibility,
      totalRows: g.totalRows,
      active: g.active,
      inactive: g.inactive,
      trialing: g.trialing,
      pendingCancel: g.pendingCancel,
      withStripeSubscription: g.withStripe,
      billableActivations: g.billable,
      estimatedMrrCents: g.mrr,
      activationRatePct,
      inactiveRecentCount: g.inactiveRecent,
    };
  });

  return {
    approvedStudioCount,
    inactiveWindowDays,
    rows,
    totals: {
      totalActivationRows,
      totalStripeBacked,
      totalInactiveRecent,
      totalBillable,
      totalEstimatedMrrCents,
    },
  };
}

/** Query param `inactiveDays` for analytics UI + CSV export; clamped 7–365, default 30. */
export function parseFeatureAnalyticsInactiveDays(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v == null || v === "") return 30;
  const n = parseInt(String(v), 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(365, Math.max(7, n));
}

function csvEscape(value: string | number | boolean): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** UTF-8 BOM prefix helps Excel open the file with correct encoding. */
export function featureAnalyticsSnapshotToCsv(snap: FeatureAnalyticsSnapshot): string {
  const header = [
    "slug",
    "name",
    "category",
    "catalog_active",
    "visibility",
    "total_activation_rows",
    "active",
    "inactive",
    "trialing",
    "pending_cancel",
    "stripe_subscription_rows",
    "billable_activations",
    "adoption_pct",
    "est_mrr_cents",
    `inactive_recent_last_${snap.inactiveWindowDays}d`,
  ];
  const lines = [header.join(",")];
  for (const r of snap.rows) {
    lines.push(
      [
        csvEscape(r.slug),
        csvEscape(r.name),
        csvEscape(r.category),
        csvEscape(r.isActive),
        csvEscape(r.visibility),
        csvEscape(r.totalRows),
        csvEscape(r.active),
        csvEscape(r.inactive),
        csvEscape(r.trialing),
        csvEscape(r.pendingCancel),
        csvEscape(r.withStripeSubscription),
        csvEscape(r.billableActivations),
        csvEscape(r.activationRatePct),
        csvEscape(r.estimatedMrrCents),
        csvEscape(r.inactiveRecentCount),
      ].join(","),
    );
  }
  return `\uFEFF${lines.join("\n")}`;
}
