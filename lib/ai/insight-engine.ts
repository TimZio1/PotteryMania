import type { BookingPaymentStatus, BookingStatus, InsightTemplate, PrismaClient } from "@prisma/client";

export type InsightFullAnalysisJson = {
  diagnosis: string;
  benchmark: string;
  recommendations: string[];
  projection: string;
  confidenceNote: string;
  /** Deep links for P3-F */
  actions?: { label: string; href: string }[];
};

export type GeneratedInsightPayload = {
  previewTitle: string;
  previewHook: string;
  potentialBenefit: string;
  priceCents: number;
  fullAnalysis: InsightFullAnalysisJson;
  confidenceScore: number;
  benchmarkSampleSize: number | null;
};

const EXCLUDED_STATUSES: BookingStatus[] = [
  "cancelled_by_customer",
  "cancelled_by_vendor",
  "cancelled_by_admin",
];
const PAID_STATUSES: BookingPaymentStatus[] = ["paid", "partial"];

function activeBookingWhere(studioId: string, createdFrom: Date) {
  return {
    studioId,
    createdAt: { gte: createdFrom },
    bookingStatus: { notIn: EXCLUDED_STATUSES },
    paymentStatus: { in: PAID_STATUSES },
  };
}

export type StudioInsightContext = {
  studioId: string;
  country: string;
  studioAvgPriceCents: number | null;
  peerAvgPriceCents: number | null;
  peerStudioCount: number;
  bookingsLast30d: number;
  bookingsLast90d: number;
  orderVendorCents30d: number;
  /** weekday 0–6 Sun–Sat -> booking count (participants) */
  weekdayDemand: Record<number, number>;
  experienceBookingCounts: Map<string, { title: string; count: number }>;
  repeatCustomerRate: number | null;
  cancellations30d: number;
  cancelledDepositCents30d: number;
  futureSlotUtilization: { filled: number; total: number } | null;
};

export async function loadStudioInsightContext(
  prisma: PrismaClient,
  studioId: string,
): Promise<StudioInsightContext | null> {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { country: true },
  });
  if (!studio) return null;

  const now = new Date();
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);
  const d90 = new Date(now);
  d90.setDate(d90.getDate() - 90);
  const d14 = new Date(now);
  d14.setDate(d14.getDate() + 14);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const [
    expAgg,
    peerRow,
    b30,
    b90,
    orderAgg,
    bookings30,
    bookings90,
    cancels,
    slots,
  ] = await Promise.all([
    prisma.experience.aggregate({
      where: { studioId, status: "active", visibility: "public" },
      _avg: { priceCents: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw<{ avg: number | null; cnt: number }[]>`
      SELECT
        AVG(e.price_cents)::float AS avg,
        COUNT(DISTINCT e.studio_id)::int AS cnt
      FROM experiences e
      INNER JOIN studios s ON s.id = e.studio_id
      WHERE e.status = 'active'
        AND e.visibility = 'public'
        AND s.country = ${studio.country}
        AND s.id != ${studioId}::uuid
    `,
    prisma.booking.count({
      where: activeBookingWhere(studioId, d30),
    }),
    prisma.booking.count({
      where: activeBookingWhere(studioId, d90),
    }),
    prisma.orderItem.aggregate({
      where: {
        vendorId: studioId,
        order: { paymentStatus: "paid", createdAt: { gte: d30 } },
      },
      _sum: { vendorAmountSnapshotCents: true },
    }),
    prisma.booking.findMany({
      where: activeBookingWhere(studioId, d30),
      select: {
        participantCount: true,
        experienceId: true,
        experience: { select: { title: true } },
        slot: { select: { slotDate: true } },
      },
    }),
    prisma.booking.findMany({
      where: activeBookingWhere(studioId, d90),
      select: { customerEmail: true },
    }),
    prisma.booking.findMany({
      where: {
        studioId,
        createdAt: { gte: d30 },
        bookingStatus: {
          in: ["cancelled_by_customer", "cancelled_by_vendor", "cancelled_by_admin"],
        },
      },
      select: { depositAmountCents: true },
    }),
    prisma.bookingSlot.findMany({
      where: {
        experience: { studioId },
        slotDate: { gte: dayStart, lt: d14 },
        status: "open",
      },
      select: { capacityTotal: true, capacityReserved: true },
      take: 400,
    }),
  ]);

  const weekdayDemand: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const experienceBookingCounts = new Map<string, { title: string; count: number }>();
  for (const row of bookings30) {
    const wd = row.slot.slotDate.getUTCDay();
    weekdayDemand[wd] = (weekdayDemand[wd] ?? 0) + row.participantCount;
    const prev = experienceBookingCounts.get(row.experienceId) ?? {
      title: row.experience.title,
      count: 0,
    };
    prev.count += row.participantCount;
    experienceBookingCounts.set(row.experienceId, prev);
  }

  const emailCounts = new Map<string, number>();
  for (const row of bookings90) {
    const k = row.customerEmail.trim().toLowerCase();
    emailCounts.set(k, (emailCounts.get(k) ?? 0) + 1);
  }
  let repeatCustomerRate: number | null = null;
  if (bookings90.length >= 8) {
    const multi = [...emailCounts.values()].filter((n) => n >= 2).length;
    repeatCustomerRate = emailCounts.size > 0 ? multi / emailCounts.size : 0;
  }

  let futureSlotUtilization: { filled: number; total: number } | null = null;
  if (slots.length >= 3) {
    let filled = 0;
    let total = 0;
    for (const s of slots) {
      const cap = Math.max(s.capacityTotal, 1);
      filled += s.capacityReserved;
      total += cap;
    }
    futureSlotUtilization = { filled, total };
  }

  const peer = peerRow[0];
  return {
    studioId,
    country: studio.country,
    studioAvgPriceCents:
      expAgg._avg.priceCents != null && expAgg._count._all > 0
        ? Math.round(expAgg._avg.priceCents)
        : null,
    peerAvgPriceCents: peer?.avg != null ? Math.round(peer.avg) : null,
    peerStudioCount: peer?.cnt ?? 0,
    bookingsLast30d: b30,
    bookingsLast90d: b90,
    orderVendorCents30d: orderAgg._sum.vendorAmountSnapshotCents ?? 0,
    weekdayDemand,
    experienceBookingCounts,
    repeatCustomerRate,
    cancellations30d: cancels.length,
    cancelledDepositCents30d: cancels.reduce((s, c) => s + c.depositAmountCents, 0),
    futureSlotUtilization,
  };
}

function pctBelowStudioVsPeer(studio: number, peer: number): number {
  if (peer <= 0) return 0;
  return Math.round(((peer - studio) / peer) * 100);
}

export function buildInsightForTemplate(
  template: Pick<InsightTemplate, "slug" | "basePriceCents" | "complexity">,
  ctx: StudioInsightContext,
): GeneratedInsightPayload | null {
  const priceCents = template.basePriceCents;

  switch (template.slug) {
    case "pricing_vs_median": {
      if (
        ctx.studioAvgPriceCents == null ||
        ctx.peerAvgPriceCents == null ||
        ctx.peerStudioCount < 3
      ) {
        return null;
      }
      const below = pctBelowStudioVsPeer(ctx.studioAvgPriceCents, ctx.peerAvgPriceCents);
      if (below < 5 && below > -15) return null;
      const hook =
        below > 0
          ? `Your listed class price is about ${below}% below the anonymized average for active listings in ${ctx.country}.`
          : `Your listed class price is about ${Math.abs(below)}% above the anonymized average for active listings in ${ctx.country}.`;
      const benefit =
        below > 0
          ? `+€${Math.min(500, Math.max(20, Math.round((ctx.peerAvgPriceCents - ctx.studioAvgPriceCents) / 100) * 4))}/mo est.`
          : "Protect margin while staying competitive.";
      return {
        previewTitle: "Class pricing vs similar studios",
        previewHook: hook,
        potentialBenefit: benefit,
        priceCents,
        confidenceScore: Math.min(0.95, 0.45 + ctx.peerStudioCount * 0.02),
        benchmarkSampleSize: ctx.peerStudioCount,
        fullAnalysis: {
          diagnosis: `Your active public classes average €${(ctx.studioAvgPriceCents / 100).toFixed(2)} per participant. Across ${ctx.peerStudioCount} other studios in ${ctx.country} with active public classes, the average list price is about €${(ctx.peerAvgPriceCents / 100).toFixed(2)}.`,
          benchmark: `Sample: ${ctx.peerStudioCount} studios (anonymized). Directional only — mix of duration, format, and inclusions varies.`,
          recommendations:
            below > 0
              ? [
                  "Review your lowest-performing class prices against your best seller before raising across the board.",
                  "Test a small increase on one high-demand experience and watch waitlist and conversion for 2–3 weeks.",
                  "Keep deposits aligned with cancellation policy when adjusting headline prices.",
                ]
              : [
                  "Document what’s included (materials, firing, pieces taken home) so premium pricing feels fair.",
                  "Add a mid-tier option if you only run premium workshops today.",
                ],
          projection:
            below > 0
              ? "If demand holds, modest price alignment often recovers single-digit % revenue on the same volume — not guaranteed."
              : "Premium positioning can work with strong differentiation; watch booking lead times after changes.",
          confidenceNote: `Based on ${ctx.peerStudioCount} comparable studios in your country and your active listings.`,
          actions: [{ label: "Edit programs", href: `/dashboard/${ctx.studioId}/programs` }],
        },
      };
    }
    case "schedule_weak_slots": {
      if (ctx.bookingsLast30d < 5) return null;
      const entries = Object.entries(ctx.weekdayDemand).map(([d, n]) => ({
        d: Number(d),
        n,
      }));
      entries.sort((a, b) => a.n - b.n);
      const weakest = entries[0];
      const strongest = entries[entries.length - 1];
      if (!weakest || !strongest || strongest.n === 0) return null;
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const ratio = strongest.n > 0 ? weakest.n / strongest.n : 0;
      if (ratio > 0.65) return null;
      return {
        previewTitle: "Underperforming time pattern",
        previewHook: `${dayNames[weakest.d]} sessions draw fewer participants than your busiest day in the last 30 days.`,
        potentialBenefit: "+€40–120/mo est. if you reallocate one slot",
        priceCents,
        confidenceScore: 0.55,
        benchmarkSampleSize: ctx.bookingsLast30d,
        fullAnalysis: {
          diagnosis: `Participant-weighted demand is lowest on ${dayNames[weakest.d]} (${weakest.n} seats) vs ${dayNames[strongest.d]} (${strongest.n}) in the last 30 days.`,
          benchmark: "Internal benchmark only — compares your studio to itself.",
          recommendations: [
            `Try moving or marketing ${dayNames[weakest.d]} slots before deleting capacity.`,
            "Bundle quieter sessions with a clear theme or shorter format.",
            "Promote the weak day in email/social with a time-limited seat goal.",
          ],
          projection: "If one underused slot converts closer to your studio’s weekday average, revenue impact is usually small but compounding.",
          confidenceNote: `Based on ${ctx.bookingsLast30d} qualifying bookings in the last 30 days.`,
          actions: [
            { label: "Open calendar", href: `/dashboard/${ctx.studioId}/schedule/calendar` },
            { label: "Edit programs", href: `/dashboard/${ctx.studioId}/programs` },
          ],
        },
      };
    }
    case "class_demand_mix": {
      if (ctx.experienceBookingCounts.size < 2 || ctx.bookingsLast30d < 4) return null;
      const sorted = [...ctx.experienceBookingCounts.values()].sort((a, b) => b.count - a.count);
      const top = sorted[0];
      const bottom = sorted[sorted.length - 1];
      if (!top || !bottom || top.title === bottom.title) return null;
      if (bottom.count === 0 || top.count / Math.max(bottom.count, 1) < 1.8) return null;
      return {
        previewTitle: "Class mix imbalance",
        previewHook: `“${top.title}” is carrying more of your recent volume than “${bottom.title}”.`,
        potentialBenefit: "Rebalance marketing + schedule",
        priceCents,
        confidenceScore: 0.6,
        benchmarkSampleSize: ctx.bookingsLast30d,
        fullAnalysis: {
          diagnosis: `Last 30 days: strongest experience by participant volume is “${top.title}”; lowest among your active mix is “${bottom.title}”.`,
          benchmark: "Studio-internal mix only — not compared to other studios.",
          recommendations: [
            `Give “${bottom.title}” a clearer hook on the listing page (outcome, skill level, materials).`,
            "Try one cross-sell line on confirmation emails from the popular class to the quieter one.",
            "If the weak class overlaps a saturated time, test a different slot before changing price.",
          ],
          projection: "Shifting even a small share of demand to an underused class improves utilization without new acquisition.",
          confidenceNote: `Based on participant counts across ${ctx.experienceBookingCounts.size} experiences.`,
          actions: [{ label: "Manage programs", href: `/dashboard/${ctx.studioId}/programs` }],
        },
      };
    }
    case "student_retention_signal": {
      if (ctx.repeatCustomerRate == null) return null;
      const pct = Math.round(ctx.repeatCustomerRate * 100);
      const weak = ctx.repeatCustomerRate < 0.22;
      if (!weak) return null;
      return {
        previewTitle: "Repeat booking rate",
        previewHook: `About ${pct}% of guests who booked in the last 90 days booked more than once — room to grow repeats.`,
        potentialBenefit: "+€80–200/mo est. with follow-up",
        priceCents,
        confidenceScore: 0.5,
        benchmarkSampleSize: ctx.bookingsLast90d,
        fullAnalysis: {
          diagnosis:
            "Repeat rate is inferred from customer email: multiple paid/partial bookings in the last 90 days vs unique emails.",
          benchmark: "Rule-of-thumb: many small studios land roughly 20–35% repeat within 90 days when classes run weekly — your mileage varies.",
          recommendations: [
            "Send a simple “next class” suggestion 7 days after completion with one recommended date.",
            "Offer a returning-student perk that does not undercut your headline price.",
            "Track no-shows separately — they deflate perceived retention.",
          ],
          projection: "A few extra repeat bookings per month typically beat discounting for new traffic.",
          confidenceNote: `Based on ${ctx.bookingsLast90d} qualifying bookings in the last 90 days.`,
          actions: [{ label: "View guests", href: `/dashboard/${ctx.studioId}/guests` }],
        },
      };
    }
    case "revenue_leakage_no_shows": {
      if (ctx.cancellations30d < 1) return null;
      const eur = (ctx.cancelledDepositCents30d / 100).toFixed(2);
      return {
        previewTitle: "Cancellation deposit exposure",
        previewHook: `${ctx.cancellations30d} cancellation(s) in the last 30 days with about €${eur} in recorded deposits.`,
        potentialBenefit: "Tighten policy + reminders",
        priceCents,
        confidenceScore: 0.55,
        benchmarkSampleSize: ctx.cancellations30d,
        fullAnalysis: {
          diagnosis:
            "Totals use booking rows marked cancelled and their stored deposit amounts — refunds may already have occurred; treat as exposure, not net loss.",
          benchmark: "Compare to your own prior month in the analytics tab when available.",
          recommendations: [
            "Align reminder timing with your cancellation windows.",
            "Clarify deposit vs balance on the booking confirmation.",
            "Review experiences with the highest cancel rate first.",
          ],
          projection: "Reducing preventable cancels often returns more than marginal price tweaks.",
          confidenceNote: `Based on ${ctx.cancellations30d} cancelled bookings in the last 30 days.`,
          actions: [
            { label: "Sessions", href: `/dashboard/${ctx.studioId}/schedule/sessions` },
            { label: "Settings", href: `/dashboard/${ctx.studioId}/settings` },
          ],
        },
      };
    }
    case "capacity_utilization": {
      if (!ctx.futureSlotUtilization) return null;
      const { filled, total } = ctx.futureSlotUtilization;
      const util = total > 0 ? filled / total : 0;
      if (util >= 0.42) return null;
      const pct = Math.round(util * 100);
      return {
        previewTitle: "Upcoming capacity utilization",
        previewHook: `Roughly ${pct}% of seat capacity is reserved on open sessions in the next two weeks.`,
        potentialBenefit: "Fill empty seats first",
        priceCents,
        confidenceScore: 0.52,
        benchmarkSampleSize: total,
        fullAnalysis: {
          diagnosis: `Open slots in the next 14 days show ${filled} reserved seats out of ${total} total seat capacity (approximation).`,
          benchmark: "Internal utilization snapshot — does not include private or unlisted holds.",
          recommendations: [
            "Run a short campaign on the next two weekends before changing prices.",
            "Surface one “almost full” class to create urgency.",
            "Pair product shop promos with class dates if you sell pieces.",
          ],
          projection: "Moving utilization from low thirties toward ~50% on the same capacity usually lifts class revenue without new slots.",
          confidenceNote: "Based on open booking slots in the next 14 days.",
          actions: [{ label: "Calendar", href: `/dashboard/${ctx.studioId}/schedule/calendar` }],
        },
      };
    }
    case "feature_recommendation_addons": {
      const hasShop = ctx.orderVendorCents30d > 0;
      const hasBookings = ctx.bookingsLast30d > 0;
      if (!hasShop && !hasBookings) return null;
      const recs: string[] = [];
      const actions: { label: string; href: string }[] = [
        { label: "Features / Add-ons", href: `/dashboard/${ctx.studioId}/features` },
      ];
      if (ctx.bookingsLast30d >= 6) {
        recs.push("Waitlist add-on: you have steady booking volume — capture overflow when slots fill.");
        actions.push({ label: "Programs", href: `/dashboard/${ctx.studioId}/programs` });
      }
      if (hasShop) {
        recs.push("Online shop module: you already show product revenue — ensure listings stay in sync with kiln/production.");
        actions.push({ label: "Catalog", href: `/dashboard/${ctx.studioId}/commerce/catalog` });
      }
      if (recs.length === 0) {
        recs.push("Advanced analytics: track week-over-week when you start scaling past a handful of classes per month.");
      }
      return {
        previewTitle: "Platform add-ons that fit your activity",
        previewHook: hasShop
          ? "Your studio mixes classes and shop sales — a few paid modules tend to pay for themselves faster."
          : "Your booking volume suggests specific platform upgrades will save time next.",
        potentialBenefit: "Pick 1 module to test",
        priceCents,
        confidenceScore: 0.48,
        benchmarkSampleSize: null,
        fullAnalysis: {
          diagnosis: `Signals: ${ctx.bookingsLast30d} qualifying bookings and €${(ctx.orderVendorCents30d / 100).toFixed(2)} estimated shop vendor total (30d).`,
          benchmark: "Recommendations are heuristic — enable only what you will actually use this quarter.",
          recommendations: recs,
          projection: "Add-ons matter when they remove manual work or recover dropped bookings; skip if you are still validating demand.",
          confidenceNote: "Rule-based mapping from your recent activity — not a personalized invoice estimate.",
          actions,
        },
      };
    }
    default:
      return null;
  }
}
