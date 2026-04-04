import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeStreamProfitability, computeUserProfitability } from "./profitability";

function startUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

async function upsertAlert(input: {
  dedupeKey: string;
  alertType: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  summary: string;
  whyItMatters: string;
  likelyCause?: string;
  recommendedAction: string;
  metrics?: Record<string, unknown>;
}) {
  try {
    await prisma.financialAlert.create({
      data: {
        dedupeKey: input.dedupeKey,
        alertType: input.alertType,
        severity: input.severity,
        status: "open",
        title: input.title,
        summary: input.summary,
        whyItMatters: input.whyItMatters,
        likelyCause: input.likelyCause,
        recommendedAction: input.recommendedAction,
        metrics: input.metrics !== undefined ? (input.metrics as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return;
    }
    throw e;
  }
}

async function upsertRecommendation(input: {
  dedupeKey: string;
  recommendationType: string;
  impactLevel: "low" | "medium" | "high";
  difficulty: "trivial" | "easy" | "medium" | "hard";
  title: string;
  problem: string;
  suggestedAction: string;
  estimatedGainCents?: number;
  confidenceScore?: number;
  metrics?: Record<string, unknown>;
}) {
  try {
    await prisma.financialRecommendation.create({
      data: {
        dedupeKey: input.dedupeKey,
        recommendationType: input.recommendationType,
        impactLevel: input.impactLevel,
        difficulty: input.difficulty,
        status: "suggested",
        title: input.title,
        problem: input.problem,
        suggestedAction: input.suggestedAction,
        estimatedGainCents: input.estimatedGainCents,
        confidenceScore: input.confidenceScore ?? 55,
        metrics: input.metrics !== undefined ? (input.metrics as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return;
    }
    throw e;
  }
}

/**
 * Rule-based alerts and recommendations from recent ledger + commerce signals.
 */
export async function runFinancialIntelligence(): Promise<{ alerts: number; recommendations: number }> {
  const to = startUtcDay(new Date());
  const from = addDays(to, -30);
  const prevFrom = addDays(from, -30);

  const [entries30, entriesPrev, users, streams, failedOrders, snapshots] = await Promise.all([
    prisma.financeLedgerEntry.findMany({ where: { entryDate: { gte: from, lte: to } } }),
    prisma.financeLedgerEntry.findMany({ where: { entryDate: { gte: prevFrom, lt: from } } }),
    computeUserProfitability(from, to),
    computeStreamProfitability(from, to),
    prisma.order.count({
      where: { createdAt: { gte: from }, paymentStatus: "failed" },
    }),
    prisma.financialSnapshotDaily.findMany({
      where: { scopeType: "platform", scopeId: "", snapshotDate: { gte: from, lte: to } },
    }),
  ]);

  const sumFee = (rows: typeof entries30) =>
    rows.filter((e) => e.entryType === "stripe_fee" && e.direction === "debit").reduce((s, e) => s + e.amountCents, 0);
  const sumRefund = (rows: typeof entries30) =>
    rows.filter((e) => e.entryType === "refund" && e.direction === "debit").reduce((s, e) => s + e.amountCents, 0);
  const sumCommission = (rows: typeof entries30) =>
    rows
      .filter((e) => e.entryType === "platform_commission" && e.direction === "credit")
      .reduce((s, e) => s + e.amountCents, 0);

  const fee30 = sumFee(entries30);
  const feePrev = sumFee(entriesPrev);
  const ref30 = sumRefund(entries30);
  const comm30 = sumCommission(entries30);
  const commPrev = sumCommission(entriesPrev);

  let alerts = 0;
  let recommendations = 0;

  if (feePrev > 0 && fee30 > feePrev * 1.35) {
    await upsertAlert({
      dedupeKey: `intel:cost_spike:${to.toISOString().slice(0, 7)}`,
      alertType: "cost_spike",
      severity: "high",
      title: "Stripe/processing costs rose vs prior month",
      summary: `Processing-related debits are ${Math.round((fee30 / feePrev) * 100) - 100}% higher than the prior window.`,
      whyItMatters: "Fee drag directly reduces net platform margin on the same gross commerce.",
      likelyCause: "Higher volume, more cross-border cards, or more disputes/refunds.",
      recommendedAction: "Open Stripe dashboard balance view and reconcile fee categories; consider passing fees into pricing.",
      metrics: { fee30, feePrev },
    });
    alerts += 1;
  }

  if (commPrev > 100 && comm30 < commPrev * 0.65) {
    await upsertAlert({
      dedupeKey: `intel:revenue_drop:${to.toISOString().slice(0, 7)}`,
      alertType: "revenue_drop",
      severity: "high",
      title: "Platform commission revenue dropped materially",
      summary: "Commission credits in the ledger fell vs the prior comparable period.",
      whyItMatters: "This is the closest proxy to platform monetization before subscription billing.",
      recommendedAction: "Inspect order volume, approval backlog, and Stripe Connect readiness by studio.",
      metrics: { comm30, commPrev },
    });
    alerts += 1;
  }

  const withMargin = snapshots.filter((x) => x.marginBps !== null);
  const marginAvg =
    withMargin.length > 0
      ? withMargin.reduce((s, x) => s + (x.marginBps ?? 0), 0) / withMargin.length
      : null;
  if (marginAvg !== null && !Number.isNaN(marginAvg) && marginAvg < 1500) {
    await upsertAlert({
      dedupeKey: `intel:margin_collapse:${to.toISOString().slice(0, 7)}`,
      alertType: "margin_collapse",
      severity: "medium",
      title: "Average daily margin is below 15%",
      summary: "Platform snapshot margin (basis points) averaged under target.",
      whyItMatters: "Sustained low margin limits runway and reinvestment capacity.",
      recommendedAction: "Raise take rate on one stream or reduce refund/fee leakage before scaling ads.",
      metrics: { marginAvgBps: marginAvg },
    });
    alerts += 1;
  }

  if (comm30 > 0 && ref30 > comm30 * 0.12) {
    await upsertAlert({
      dedupeKey: `intel:refund_spike:${to.toISOString().slice(0, 7)}`,
      alertType: "refund_spike",
      severity: "medium",
      title: "Refunds are a large share of commission-era revenue",
      summary: "Refund debits exceed 12% of commission credits in-window.",
      whyItMatters: "Refund leakage erodes trust and net revenue simultaneously.",
      recommendedAction: "Cluster refunds by studio and SKU; fix capacity/approval flows causing auto-cancels.",
      metrics: { ref30, comm30 },
    });
    alerts += 1;
  }

  const attempts = await prisma.order.count({ where: { createdAt: { gte: from } } });
  if (attempts > 10 && failedOrders / attempts > 0.08) {
    await upsertAlert({
      dedupeKey: `intel:payment_failures:${to.toISOString().slice(0, 7)}`,
      alertType: "payment_failure_spike",
      severity: "critical",
      title: "Payment failure rate is elevated",
      summary: `${failedOrders} failed payments vs ${attempts} order attempts in 30 days.`,
      whyItMatters: "Direct revenue loss at the bottom of the funnel.",
      recommendedAction: "Audit Stripe logs, Connect onboarding completeness, and checkout error telemetry.",
      metrics: { failedOrders, attempts },
    });
    alerts += 1;
  }

  const lossUsers = users.filter((u) => u.classification === "loss_making").length;
  if (lossUsers > 0) {
    await upsertRecommendation({
      dedupeKey: `intel:rec:loss_users:${to.toISOString().slice(0, 7)}`,
      recommendationType: "user_unit_economics",
      impactLevel: "high",
      difficulty: "medium",
      title: "Tighten usage or upsell loss-making accounts",
      problem: `${lossUsers} user(s) show negative contribution in ledger allocation over 30 days.`,
      suggestedAction: "Introduce usage caps, premium support tier, or minimum order rules for heavy low-revenue accounts.",
      estimatedGainCents: Math.min(ref30, comm30 / 4),
      confidenceScore: 45,
    });
    recommendations += 1;
  }

  const bookingStream = streams.find((s) => s.stream === "booking_transactional");
  const marketStream = streams.find((s) => s.stream === "marketplace_transactional");
  if (
    bookingStream &&
    marketStream &&
    bookingStream.profitCents < marketStream.profitCents * 0.25 &&
    bookingStream.revenueCents > marketStream.revenueCents * 0.35
  ) {
    await upsertRecommendation({
      dedupeKey: `intel:rec:booking_margin:${to.toISOString().slice(0, 7)}`,
      recommendationType: "pricing_stream",
      impactLevel: "high",
      difficulty: "easy",
      title: "Classes carry margin drag vs marketplace",
      problem: "Booking commission profit is weak relative to share of commission revenue.",
      suggestedAction: "Raise booking commission bps by 50–100 bps or reduce deposit-only checkout share.",
      estimatedGainCents: Math.round(bookingStream.revenueCents * 0.08),
      confidenceScore: 50,
    });
    recommendations += 1;
  }

  const featureFacts = await prisma.featureUsageFact.findMany({
    where: { eventDate: { gte: from, lte: to } },
  });
  const costByFeature = new Map<string, number>();
  for (const f of featureFacts) {
    costByFeature.set(f.featureKey, (costByFeature.get(f.featureKey) ?? 0) + f.costCents);
  }
  const topCost = [...costByFeature.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCost && topCost[1] > fee30 * 0.2 && topCost[1] > 0) {
    await upsertRecommendation({
      dedupeKey: `intel:rec:feature_cost:${topCost[0]}:${to.toISOString().slice(0, 7)}`,
      recommendationType: "feature_cost",
      impactLevel: "medium",
      difficulty: "medium",
      title: `Feature “${topCost[0]}” dominates variable usage cost`,
      problem: "Allocated feature cost is disproportionate vs overall processing fees — check instrumentation accuracy.",
      suggestedAction: "Gate expensive paths behind premium, cache results, or reduce call frequency.",
      estimatedGainCents: Math.round(topCost[1] * 0.2),
      confidenceScore: 40,
    });
    recommendations += 1;
  }

  return { alerts, recommendations };
}
