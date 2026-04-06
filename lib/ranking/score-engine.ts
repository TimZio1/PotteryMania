import type { Prisma } from "@prisma/client";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

const WINDOW_DAYS = 30;
const PERF_WEIGHT = 0.7;
const ACTIVITY_WEIGHT = 0.2;
const MANUAL_WEIGHT = 0.1;
/** P4-G: new studios (first 14 days since creation) get a small activity lift. */
const GRACE_DAYS = 14;
const GRACE_ACTIVITY_MAX = 10;
/** P4-G: blend profile/catalog completeness into the activity component. */
const ACTIVITY_FROM_FRESHNESS = 0.72;
const ACTIVITY_FROM_PROFILE = 0.28;

const GOOD_BOOKING: BookingStatus[] = [BookingStatus.confirmed, BookingStatus.completed];

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function norm(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(100, (value / max) * 100);
}

/** P4-G: manual boost fades linearly as `endsAt` approaches (open-ended boosts keep full value). */
function decayedBoostValue(now: Date, startsAt: Date, endsAt: Date | null, boostValue: number): number {
  if (!endsAt) return boostValue;
  const end = endsAt.getTime();
  const start = startsAt.getTime();
  if (end <= start) return boostValue;
  const t = now.getTime();
  if (t >= end) return 0;
  if (t <= start) return boostValue;
  return boostValue * ((end - t) / (end - start));
}

type ProfileBits = {
  shortDescription: string | null;
  longDescription: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  stripeChargesEnabled: boolean;
  activeExperienceCount: number;
  activeProductCount: number;
};

/** P4-G: 0–100 profile + catalog readiness (not performance). */
export function profileCompletenessScore(p: ProfileBits): number {
  let pts = 0;
  if (p.shortDescription?.trim()) pts += 14;
  if ((p.longDescription?.trim()?.length ?? 0) > 80) pts += 10;
  if (p.logoUrl) pts += 10;
  if (p.coverImageUrl) pts += 10;
  if (p.latitude != null && p.longitude != null) pts += 12;
  if (p.stripeChargesEnabled) pts += 14;
  if (p.activeExperienceCount >= 1) pts += 15;
  if (p.activeProductCount >= 1) pts += 15;
  return Math.min(100, pts);
}

export type RankingUpdateResult = {
  ok: true;
  studiosProcessed: number;
  scoresDeletedNonApproved: number;
  durationMs: number;
};

/**
 * Recomputes `StudioRankingScore` for every **approved** studio (Prompt 4-B v1).
 * Performance: paid marketplace GMV (30d) + confirmed/completed class bookings (30d).
 * Activity: products + experiences with `updatedAt` in the window (proxy for catalog freshness).
 * Manual: sum of active `RankingBoost.boostValue` + `marketplaceRankWeight` (then cross-studio normalized).
 */
export async function runRankingScoreUpdate(): Promise<RankingUpdateResult> {
  const t0 = Date.now();
  const now = new Date();
  const since = new Date(now.getTime() - WINDOW_DAYS * 86400000);

  const studios = await prisma.studio.findMany({
    where: { status: "approved" },
    select: {
      id: true,
      marketplaceRankWeight: true,
      createdAt: true,
      shortDescription: true,
      longDescription: true,
      logoUrl: true,
      coverImageUrl: true,
      latitude: true,
      longitude: true,
      stripeAccount: { select: { chargesEnabled: true } },
    },
  });

  const deleted = await prisma.studioRankingScore.deleteMany({
    where: { studio: { status: { not: "approved" } } },
  });

  if (studios.length === 0) {
    return {
      ok: true,
      studiosProcessed: 0,
      scoresDeletedNonApproved: deleted.count,
      durationMs: Date.now() - t0,
    };
  }

  const studioIds = studios.map((s) => s.id);

  const [bookingGroups, orderItems, productTouches, experienceTouches, boosts, activeExpByStudio, activeProdByStudio] =
    await Promise.all([
    prisma.booking.groupBy({
      by: ["studioId"],
      where: {
        studioId: { in: studioIds },
        createdAt: { gte: since },
        bookingStatus: { in: GOOD_BOOKING },
      },
      _count: { _all: true },
    }),
    prisma.orderItem.findMany({
      where: {
        vendorId: { in: studioIds },
        order: {
          paymentStatus: "paid",
          createdAt: { gte: since },
        },
      },
      select: { vendorId: true, quantity: true, priceSnapshotCents: true },
    }),
    prisma.product.groupBy({
      by: ["studioId"],
      where: { studioId: { in: studioIds }, updatedAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.experience.groupBy({
      by: ["studioId"],
      where: { studioId: { in: studioIds }, updatedAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.rankingBoost.findMany({
      where: {
        studioId: { in: studioIds },
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      select: { studioId: true, boostValue: true, startsAt: true, endsAt: true },
    }),
    prisma.experience.groupBy({
      by: ["studioId"],
      where: { studioId: { in: studioIds }, status: "active" },
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ["studioId"],
      where: { studioId: { in: studioIds }, status: "active" },
      _count: { _all: true },
    }),
  ]);

  const bookingCount = new Map<string, number>();
  for (const g of bookingGroups) {
    bookingCount.set(g.studioId, g._count._all);
  }

  const revenueCents = new Map<string, number>();
  for (const row of orderItems) {
    const line = row.priceSnapshotCents * Math.max(1, row.quantity);
    revenueCents.set(row.vendorId, (revenueCents.get(row.vendorId) ?? 0) + line);
  }

  const productCount = new Map<string, number>();
  for (const g of productTouches) {
    productCount.set(g.studioId, g._count._all);
  }

  const experienceCount = new Map<string, number>();
  for (const g of experienceTouches) {
    experienceCount.set(g.studioId, g._count._all);
  }

  const boostSum = new Map<string, number>();
  for (const b of boosts) {
    const v = decayedBoostValue(now, b.startsAt, b.endsAt, b.boostValue);
    boostSum.set(b.studioId, (boostSum.get(b.studioId) ?? 0) + v);
  }

  const activeExpCount = new Map<string, number>();
  for (const g of activeExpByStudio) {
    activeExpCount.set(g.studioId, g._count._all);
  }
  const activeProdCount = new Map<string, number>();
  for (const g of activeProdByStudio) {
    activeProdCount.set(g.studioId, g._count._all);
  }

  let maxBook = 0;
  let maxRev = 0;
  let maxProd = 0;
  let maxExp = 0;
  let maxManualRaw = 0;

  type Row = {
    studioId: string;
    bookings30d: number;
    revenueCents30d: number;
    productsTouched30d: number;
    experiencesTouched30d: number;
    boostSum: number;
    rankWeight: number;
    manualRaw: number;
    performanceNorm: number;
    activityNorm: number;
    manualNorm: number;
    performanceScore: number;
    activityScore: number;
    manualBoost: number;
    compositeScore: number;
    scoreBreakdown: Prisma.InputJsonValue;
    profileCompleteness: number;
    graceActivityBonus: number;
  };

  const draft: Row[] = [];

  for (const s of studios) {
    const bookings30d = bookingCount.get(s.id) ?? 0;
    const revenueCents30d = revenueCents.get(s.id) ?? 0;
    const productsTouched30d = productCount.get(s.id) ?? 0;
    const experiencesTouched30d = experienceCount.get(s.id) ?? 0;
    const bSum = boostSum.get(s.id) ?? 0;
    const manualRaw = bSum + s.marketplaceRankWeight;
    const profileCompleteness = profileCompletenessScore({
      shortDescription: s.shortDescription,
      longDescription: s.longDescription,
      logoUrl: s.logoUrl,
      coverImageUrl: s.coverImageUrl,
      latitude: s.latitude,
      longitude: s.longitude,
      stripeChargesEnabled: Boolean(s.stripeAccount?.chargesEnabled),
      activeExperienceCount: activeExpCount.get(s.id) ?? 0,
      activeProductCount: activeProdCount.get(s.id) ?? 0,
    });
    const ageDays = (now.getTime() - s.createdAt.getTime()) / 86400000;
    const graceActivityBonus = ageDays < GRACE_DAYS ? GRACE_ACTIVITY_MAX * (1 - ageDays / GRACE_DAYS) : 0;
    maxBook = Math.max(maxBook, bookings30d);
    maxRev = Math.max(maxRev, revenueCents30d);
    maxProd = Math.max(maxProd, productsTouched30d);
    maxExp = Math.max(maxExp, experiencesTouched30d);
    maxManualRaw = Math.max(maxManualRaw, manualRaw);
    draft.push({
      studioId: s.id,
      bookings30d,
      revenueCents30d,
      productsTouched30d,
      experiencesTouched30d,
      boostSum: bSum,
      rankWeight: s.marketplaceRankWeight,
      manualRaw,
      performanceNorm: 0,
      activityNorm: 0,
      manualNorm: 0,
      performanceScore: 0,
      activityScore: 0,
      manualBoost: 0,
      compositeScore: 0,
      scoreBreakdown: {},
      profileCompleteness,
      graceActivityBonus,
    });
  }

  for (const r of draft) {
    const bookingPart = norm(r.bookings30d, maxBook);
    const revenuePart = norm(r.revenueCents30d, maxRev);
    r.performanceNorm = (bookingPart + revenuePart) / 2;
    const freshnessNorm =
      (norm(r.productsTouched30d, maxProd) + norm(r.experiencesTouched30d, maxExp)) / 2;
    r.activityNorm = Math.min(
      100,
      freshnessNorm * ACTIVITY_FROM_FRESHNESS +
        r.profileCompleteness * ACTIVITY_FROM_PROFILE +
        r.graceActivityBonus,
    );
    r.manualNorm = norm(r.manualRaw, maxManualRaw);
    // P4-G: curb manual/admin weight when there is no recent performance (anti pay-to-win).
    if (r.bookings30d === 0 && r.revenueCents30d === 0 && r.manualRaw > 45) {
      r.manualNorm *= 0.86;
    }
    r.performanceScore = r.performanceNorm;
    r.activityScore = r.activityNorm;
    r.manualBoost = r.manualNorm;
    r.compositeScore =
      PERF_WEIGHT * r.performanceNorm + ACTIVITY_WEIGHT * r.activityNorm + MANUAL_WEIGHT * r.manualNorm;
    r.scoreBreakdown = {
      windowDays: WINDOW_DAYS,
      bookings30d: r.bookings30d,
      revenueCents30d: r.revenueCents30d,
      productsTouched30d: r.productsTouched30d,
      experiencesTouched30d: r.experiencesTouched30d,
      boostSum: r.boostSum,
      marketplaceRankWeight: r.rankWeight,
      fairness: {
        profileCompleteness: r.profileCompleteness,
        graceActivityBonus: Math.round(r.graceActivityBonus * 10) / 10,
        boostDecayApplied: true,
        manualCappedWithoutPerformance: r.bookings30d === 0 && r.revenueCents30d === 0 && r.manualRaw > 45,
      },
      weights: { performance: PERF_WEIGHT, activity: ACTIVITY_WEIGHT, manual: MANUAL_WEIGHT },
      calculatedAtDay: startOfUtcDay(now).toISOString().slice(0, 10),
    };
  }

  const sorted = [...draft].sort((a, b) => b.compositeScore - a.compositeScore);
  const n = sorted.length;
  const percentileByStudio = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const pct = n <= 1 ? 100 : Math.max(1, Math.round(100 - (99 * i) / (n - 1)));
    percentileByStudio.set(sorted[i]!.studioId, pct);
  }

  const calculatedAt = new Date();
  const CHUNK = 20;
  for (let i = 0; i < draft.length; i += CHUNK) {
    const slice = draft.slice(i, i + CHUNK);
    await prisma.$transaction(
      slice.map((r) =>
        prisma.studioRankingScore.upsert({
          where: { studioId: r.studioId },
          create: {
            studioId: r.studioId,
            performanceScore: r.performanceScore,
            activityScore: r.activityScore,
            manualBoost: r.manualBoost,
            compositeScore: r.compositeScore,
            percentileRank: percentileByStudio.get(r.studioId) ?? 1,
            scoreBreakdown: r.scoreBreakdown,
            calculatedAt,
          },
          update: {
            performanceScore: r.performanceScore,
            activityScore: r.activityScore,
            manualBoost: r.manualBoost,
            compositeScore: r.compositeScore,
            percentileRank: percentileByStudio.get(r.studioId) ?? 1,
            scoreBreakdown: r.scoreBreakdown,
            calculatedAt,
          },
        }),
      ),
    );
  }

  return {
    ok: true,
    studiosProcessed: studios.length,
    scoresDeletedNonApproved: deleted.count,
    durationMs: Date.now() - t0,
  };
}

export type StudioWithRankingSort = {
  id: string;
  displayName: string;
  marketplaceRankWeight: number;
  rankingScore: { compositeScore: number } | null;
};

/** P4-G v1: within each composite band (width `bandWidth`), shuffle order to reduce stagnation. */
export function fairShuffleByCompositeBand<T>(rows: T[], getComposite: (t: T) => number, bandWidth = 5): T[] {
  if (rows.length <= 1) return rows;
  const sorted = [...rows].sort((a, b) => getComposite(b) - getComposite(a));
  const out: T[] = [];
  let i = 0;
  while (i < sorted.length) {
    const ceiling = getComposite(sorted[i]!);
    const floor = ceiling - bandWidth;
    const chunk: T[] = [];
    while (i < sorted.length && getComposite(sorted[i]!) > floor) {
      chunk.push(sorted[i]!);
      i++;
    }
    for (let k = chunk.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      const t = chunk[k]!;
      chunk[k] = chunk[j]!;
      chunk[j] = t;
    }
    out.push(...chunk);
  }
  return out;
}

/** Default "Recommended" ordering: composite score bands, shuffled within band (P4-G), then stable tie-breaks prepass. */
export function sortStudiosByMarketplaceRanking<T extends StudioWithRankingSort>(studios: T[]): T[] {
  const deterministic = [...studios].sort((a, b) => {
    const ca = a.rankingScore?.compositeScore ?? 0;
    const cb = b.rankingScore?.compositeScore ?? 0;
    if (Math.abs(cb - ca) > 1e-9) return cb - ca;
    const wa = a.marketplaceRankWeight;
    const wb = b.marketplaceRankWeight;
    if (wb !== wa) return wb - wa;
    return a.displayName.localeCompare(b.displayName);
  });
  return fairShuffleByCompositeBand(deterministic, (s) => s.rankingScore?.compositeScore ?? 0);
}

/** `/classes` list row: parent studio carries ranking for sort (non-geo mode). */
export type ExperienceListStudioForRanking = {
  marketplaceRankWeight: number;
  rankingScore: { compositeScore: number } | null;
};

export type ExperienceRowWithStudioRanking = {
  createdAt: Date;
  studio: ExperienceListStudioForRanking;
};

/** Recommended class order: studio composite bands with in-band shuffle (P4-G). */
export function sortExperiencesByMarketplaceRanking<T extends ExperienceRowWithStudioRanking>(rows: T[]): T[] {
  const deterministic = [...rows].sort((a, b) => {
    const ca = a.studio.rankingScore?.compositeScore ?? 0;
    const cb = b.studio.rankingScore?.compositeScore ?? 0;
    if (Math.abs(cb - ca) > 1e-9) return cb - ca;
    const wa = a.studio.marketplaceRankWeight;
    const wb = b.studio.marketplaceRankWeight;
    if (wb !== wa) return wb - wa;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return fairShuffleByCompositeBand(deterministic, (r) => r.studio.rankingScore?.compositeScore ?? 0);
}

/** `/marketplace` product row: studio ranking + featured + recency (recommended sort). */
export type ProductRowWithStudioRanking = {
  isFeatured: boolean;
  createdAt: Date;
  studio: ExperienceListStudioForRanking;
};

/**
 * Featured listings stay first; within featured and within non-featured, apply composite band shuffle (P4-G).
 */
export function sortProductsByMarketplaceRanking<T extends ProductRowWithStudioRanking>(rows: T[]): T[] {
  const rankChunk = (chunk: T[]) => {
    const deterministic = [...chunk].sort((a, b) => {
      const ca = a.studio.rankingScore?.compositeScore ?? 0;
      const cb = b.studio.rankingScore?.compositeScore ?? 0;
      if (Math.abs(cb - ca) > 1e-9) return cb - ca;
      const wa = a.studio.marketplaceRankWeight;
      const wb = b.studio.marketplaceRankWeight;
      if (wb !== wa) return wb - wa;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    return fairShuffleByCompositeBand(deterministic, (r) => r.studio.rankingScore?.compositeScore ?? 0);
  };
  const featured = rows.filter((r) => r.isFeatured);
  const rest = rows.filter((r) => !r.isFeatured);
  return [...rankChunk(featured), ...rankChunk(rest)];
}
