import type {
  Prisma,
  PrismaClient,
  StudioFeatureActivationEventKind,
  StudioFeatureActivationStatus,
} from "@prisma/client";

const BILLABLE: StudioFeatureActivationStatus[] = ["active", "trialing", "pending_cancel"];

export type FeatureAnalyticsRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  /** Catalog list price (editable from feature hub). */
  catalogPriceCents: number;
  currency: string;
  isActive: boolean;
  visibility: string;
  grantByDefault: boolean;
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
      catalogPriceCents: f.priceCents,
      currency: f.currency,
      isActive: f.isActive,
      visibility: f.visibility,
      grantByDefault: f.grantByDefault,
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
    "list_price_cents",
    "currency",
    "catalog_active",
    "visibility",
    "grant_by_default",
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
        csvEscape(r.catalogPriceCents),
        csvEscape(r.currency),
        csvEscape(r.isActive),
        csvEscape(r.visibility),
        csvEscape(r.grantByDefault),
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

export type FeatureActivationAuditDailyPoint = { label: string; value: number };

export type FeatureActivationAuditDailySeries = {
  windowDays: number;
  /** Hyperadmin PATCH …/feature-activations with status → active (excludes vendor self-serve / Stripe). */
  grants: FeatureActivationAuditDailyPoint[];
  /** Same source, status → inactive. */
  revokes: FeatureActivationAuditDailyPoint[];
};

function buildUtcCalendarDayKeys(dayCount: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function shortUtcLabel(isoDay: string): string {
  const [, m, d] = isoDay.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function featureSlugFromAuditAfter(j: Prisma.JsonValue | null): string | null {
  if (j === null || typeof j !== "object" || Array.isArray(j)) return null;
  const s = (j as Record<string, unknown>).featureSlug;
  return typeof s === "string" ? s : null;
}

/**
 * P2-G v3 (partial): daily buckets from `admin_audit_logs` for hyperadmin activation changes only.
 * Optional `featureSlug` narrows to one catalog SKU (matches `after_json.featureSlug`).
 */
export async function featureActivationAdminAuditDailySeries(
  prisma: PrismaClient,
  opts: { windowDays: number; featureSlug?: string | null },
): Promise<FeatureActivationAuditDailySeries> {
  const windowDays = Math.min(365, Math.max(7, opts.windowDays));
  const slugFilter = opts.featureSlug?.trim() || null;

  const dayKeys = buildUtcCalendarDayKeys(windowDays);
  const queryFrom = new Date(`${dayKeys[0]}T00:00:00.000Z`);

  const logs = await prisma.adminAuditLog.findMany({
    where: {
      action: "studio.feature_activation_admin",
      createdAt: { gte: queryFrom },
      reason: { in: ["status:active", "status:inactive"] },
    },
    select: { createdAt: true, reason: true, afterJson: true },
  });

  const grantMap = new Map(dayKeys.map((k) => [k, 0]));
  const revokeMap = new Map(dayKeys.map((k) => [k, 0]));

  for (const row of logs) {
    const slug = featureSlugFromAuditAfter(row.afterJson);
    if (slugFilter && slug !== slugFilter) continue;

    const key = row.createdAt.toISOString().slice(0, 10);
    if (!grantMap.has(key)) continue;

    if (row.reason === "status:active") {
      grantMap.set(key, (grantMap.get(key) ?? 0) + 1);
    } else if (row.reason === "status:inactive") {
      revokeMap.set(key, (revokeMap.get(key) ?? 0) + 1);
    }
  }

  const grants: FeatureActivationAuditDailyPoint[] = dayKeys.map((k) => ({
    label: shortUtcLabel(k),
    value: grantMap.get(k) ?? 0,
  }));
  const revokes: FeatureActivationAuditDailyPoint[] = dayKeys.map((k) => ({
    label: shortUtcLabel(k),
    value: revokeMap.get(k) ?? 0,
  }));

  return { windowDays, grants, revokes };
}

export type FeatureActivationLifecycleDailySeries = {
  windowDays: number;
  /** First insert of a studio+feature activation row (`createdAt` UTC date). */
  rowsCreated: FeatureActivationAuditDailyPoint[];
  /**
   * Rows whose `activatedAt` falls on that UTC day (vendor free enable, Stripe checkout webhook, admin grant).
   * Multiple updates the same day can count more than once per studio+feature if `activatedAt` is written again.
   */
  activatedAtEvents: FeatureActivationAuditDailyPoint[];
};

/**
 * P2-G / P5-E: DB-backed daily counts from `StudioFeatureActivation` (vendor + Stripe + admin paths that set timestamps).
 */
export async function featureActivationLifecycleDailySeries(
  prisma: PrismaClient,
  opts: { windowDays: number; featureId?: string | null },
): Promise<FeatureActivationLifecycleDailySeries> {
  const windowDays = Math.min(365, Math.max(7, opts.windowDays));
  const fid = opts.featureId?.trim() || null;
  const featureWhere = fid ? { featureId: fid } : {};

  const dayKeys = buildUtcCalendarDayKeys(windowDays);
  const queryFrom = new Date(`${dayKeys[0]}T00:00:00.000Z`);

  const [createdRows, activatedRows] = await Promise.all([
    prisma.studioFeatureActivation.findMany({
      where: { createdAt: { gte: queryFrom }, ...featureWhere },
      select: { createdAt: true },
    }),
    prisma.studioFeatureActivation.findMany({
      where: { activatedAt: { gte: queryFrom }, ...featureWhere },
      select: { activatedAt: true },
    }),
  ]);

  const createdMap = new Map(dayKeys.map((k) => [k, 0]));
  const activatedMap = new Map(dayKeys.map((k) => [k, 0]));

  for (const r of createdRows) {
    const k = r.createdAt.toISOString().slice(0, 10);
    if (createdMap.has(k)) createdMap.set(k, (createdMap.get(k) ?? 0) + 1);
  }
  for (const r of activatedRows) {
    const at = r.activatedAt;
    if (!at) continue;
    const k = at.toISOString().slice(0, 10);
    if (activatedMap.has(k)) activatedMap.set(k, (activatedMap.get(k) ?? 0) + 1);
  }

  return {
    windowDays,
    rowsCreated: dayKeys.map((k) => ({ label: shortUtcLabel(k), value: createdMap.get(k) ?? 0 })),
    activatedAtEvents: dayKeys.map((k) => ({ label: shortUtcLabel(k), value: activatedMap.get(k) ?? 0 })),
  };
}

export type FeatureActivationEventLedgerDailySeries = {
  windowDays: number;
  /** `checkout_single` + `checkout_bundle` rows in `studio_feature_activation_events`. */
  stripeCheckouts: FeatureActivationAuditDailyPoint[];
  /** `stripe_subscription_ended` (cancel API, vendor off, or Stripe `subscription.deleted`). */
  stripeSubscriptionEnds: FeatureActivationAuditDailyPoint[];
  /**
   * Directional signal from the append-only ledger (not true cohort retention): +1 for enable-shaped kinds,
   * -1 for disable-shaped; `admin_override_price` ignored.
   */
  ledgerNet: FeatureActivationAuditDailyPoint[];
};

function ledgerKindDelta(kind: StudioFeatureActivationEventKind): number {
  if (
    kind === "vendor_enable" ||
    kind === "checkout_single" ||
    kind === "checkout_bundle" ||
    kind === "admin_active"
  ) {
    return 1;
  }
  if (
    kind === "vendor_disable" ||
    kind === "admin_inactive" ||
    kind === "stripe_subscription_ended"
  ) {
    return -1;
  }
  return 0;
}

/**
 * Append-only ledger (`StudioFeatureActivationEvent`) — durable Stripe checkout / sub-end counts.
 * No backfill for history before this table shipped.
 */
export async function featureActivationEventLedgerDailySeries(
  prisma: PrismaClient,
  opts: { windowDays: number; featureId?: string | null },
): Promise<FeatureActivationEventLedgerDailySeries> {
  const windowDays = Math.min(365, Math.max(7, opts.windowDays));
  const fid = opts.featureId?.trim() || null;
  const dayKeys = buildUtcCalendarDayKeys(windowDays);
  const queryFrom = new Date(`${dayKeys[0]}T00:00:00.000Z`);

  const rows = await prisma.studioFeatureActivationEvent.findMany({
    where: {
      createdAt: { gte: queryFrom },
      ...(fid ? { featureId: fid } : {}),
    },
    select: { kind: true, createdAt: true },
  });

  const checkoutMap = new Map(dayKeys.map((k) => [k, 0]));
  const endedMap = new Map(dayKeys.map((k) => [k, 0]));
  const netMap = new Map(dayKeys.map((k) => [k, 0]));

  for (const r of rows) {
    const k = r.createdAt.toISOString().slice(0, 10);
    if (!checkoutMap.has(k)) continue;
    if (r.kind === "checkout_single" || r.kind === "checkout_bundle") {
      checkoutMap.set(k, (checkoutMap.get(k) ?? 0) + 1);
    }
    if (r.kind === "stripe_subscription_ended") {
      endedMap.set(k, (endedMap.get(k) ?? 0) + 1);
    }
    const d = ledgerKindDelta(r.kind);
    if (d !== 0) {
      netMap.set(k, (netMap.get(k) ?? 0) + d);
    }
  }

  return {
    windowDays,
    stripeCheckouts: dayKeys.map((k) => ({ label: shortUtcLabel(k), value: checkoutMap.get(k) ?? 0 })),
    stripeSubscriptionEnds: dayKeys.map((k) => ({ label: shortUtcLabel(k), value: endedMap.get(k) ?? 0 })),
    ledgerNet: dayKeys.map((k) => ({ label: shortUtcLabel(k), value: netMap.get(k) ?? 0 })),
  };
}
