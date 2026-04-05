import type { Prisma } from "@prisma/client";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

const WINDOW_DAYS = 30;
const PERF_WEIGHT = 0.7;
const ACTIVITY_WEIGHT = 0.2;
const MANUAL_WEIGHT = 0.1;

const GOOD_BOOKING: BookingStatus[] = [BookingStatus.confirmed, BookingStatus.completed];

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function norm(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(100, (value / max) * 100);
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
    select: { id: true, marketplaceRankWeight: true },
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

  const [bookingGroups, orderItems, productTouches, experienceTouches, boosts] = await Promise.all([
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
      select: { studioId: true, boostValue: true },
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
    boostSum.set(b.studioId, (boostSum.get(b.studioId) ?? 0) + b.boostValue);
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
  };

  const draft: Row[] = [];

  for (const s of studios) {
    const bookings30d = bookingCount.get(s.id) ?? 0;
    const revenueCents30d = revenueCents.get(s.id) ?? 0;
    const productsTouched30d = productCount.get(s.id) ?? 0;
    const experiencesTouched30d = experienceCount.get(s.id) ?? 0;
    const bSum = boostSum.get(s.id) ?? 0;
    const manualRaw = bSum + s.marketplaceRankWeight;
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
    });
  }

  for (const r of draft) {
    const bookingPart = norm(r.bookings30d, maxBook);
    const revenuePart = norm(r.revenueCents30d, maxRev);
    r.performanceNorm = (bookingPart + revenuePart) / 2;
    r.activityNorm =
      (norm(r.productsTouched30d, maxProd) + norm(r.experiencesTouched30d, maxExp)) / 2;
    r.manualNorm = norm(r.manualRaw, maxManualRaw);
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

/** Default "Recommended" ordering: composite score → admin rank weight → name. */
export function sortStudiosByMarketplaceRanking<T extends StudioWithRankingSort>(studios: T[]): T[] {
  return [...studios].sort((a, b) => {
    const ca = a.rankingScore?.compositeScore ?? 0;
    const cb = b.rankingScore?.compositeScore ?? 0;
    if (Math.abs(cb - ca) > 1e-9) return cb - ca;
    const wa = a.marketplaceRankWeight;
    const wb = b.marketplaceRankWeight;
    if (wb !== wa) return wb - wa;
    return a.displayName.localeCompare(b.displayName);
  });
}
