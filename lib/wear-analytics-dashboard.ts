import type { WearOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { WEAR_EVENT_KINDS } from "@/lib/wear-event-kinds";
import { WEAR_ORDER_PAID_LIKE } from "@/lib/wear-order-lifecycle";

const WEAR_CHECKOUT_SESSION_STATUSES: WearOrderStatus[] = ["pending", ...WEAR_ORDER_PAID_LIKE];

export type WearAnalyticsRangePreset = "today" | "7d" | "30d" | "custom";

export type WearDateRange = {
  start: Date;
  end: Date;
  label: string;
  preset: WearAnalyticsRangePreset;
};

export function parseWearAnalyticsRange(params: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
}): WearDateRange {
  const now = new Date();
  const raw = params.range ?? "7d";
  const preset: WearAnalyticsRangePreset =
    raw === "today" || raw === "7d" || raw === "30d" || raw === "custom" ? raw : "7d";

  if (preset === "custom" && params.from && params.to) {
    const start = new Date(`${params.from}T00:00:00.000Z`);
    const end = new Date(`${params.to}T23:59:59.999Z`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
      return {
        start,
        end,
        label: `${params.from} → ${params.to}`,
        preset: "custom",
      };
    }
  }

  const effective: WearAnalyticsRangePreset = preset === "custom" ? "7d" : preset;
  const end = now;
  let start: Date;
  let label: string;

  if (effective === "today") {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    label = "Today";
  } else if (effective === "30d") {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    label = "Last 30 days";
  } else {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    label = "Last 7 days";
  }

  return { start, end, label, preset: effective };
}

export type WearFunnelStep = {
  key: string;
  label: string;
  count: number;
  pctOfPrev: number | null;
};

export type WearFunnelDropoff = {
  fromLabel: string;
  toLabel: string;
  dropPct: number;
  fromCount: number;
  toCount: number;
};

export type WearProductPerf = {
  productId: string;
  name: string;
  slug: string;
  views: number;
  addToCart: number;
  /** Checkout sessions in range that included this product (pending + paid orders). */
  checkoutStarted: number;
  /** Paid orders in range that included this product (distinct orders). */
  purchases: number;
  quantitySold: number;
  revenueCents: number;
  /** Paid purchases ÷ PDP views (same window). Null when views = 0. */
  conversionPct: number | null;
};

export type WearDailyRevenue = { day: string; cents: number };

export type WearRevenueWindows = {
  todayCents: number;
  last7Cents: number;
  last30Cents: number;
};

export type WearDashboardData = {
  range: WearDateRange;
  revenueWindows: WearRevenueWindows;
  overview: {
    revenueCents: number;
    orderCount: number;
    aovCents: number | null;
    /** PDP views → paid order (overall). */
    conversionViewToPurchasePct: number | null;
    topProduct: { id: string; name: string; slug: string; revenueCents: number } | null;
  };
  funnel: WearFunnelStep[];
  funnelDropoff: WearFunnelDropoff | null;
  topProducts: WearProductPerf[];
  dailyRevenue: WearDailyRevenue[];
  insights: string[];
  /** Any wear signal in the selected range. */
  hasActivity: boolean;
  /** Funnel event counts in range. */
  hasFunnelData: boolean;
  /** Paid orders in range. */
  hasPurchases: boolean;
};

function revenueForOrder(o: { amountTotalCents: number | null; subtotalCents: number }) {
  return o.amountTotalCents ?? o.subtotalCents;
}

function utcDayStart(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function eachUtcDayInclusive(start: Date, end: Date): string[] {
  const out: string[] = [];
  const a = utcDayStart(start);
  const b = utcDayStart(end);
  for (let t = a.getTime(); t <= b.getTime(); t += 24 * 60 * 60 * 1000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

function computeFunnelDropoff(steps: WearFunnelStep[]): WearFunnelDropoff | null {
  let worst: WearFunnelDropoff | null = null;
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1]!;
    const curr = steps[i]!;
    const fromCount = prev.count;
    const toCount = curr.count;
    if (fromCount <= 0) continue;
    const dropPct = Math.round((1 - toCount / fromCount) * 10000) / 100;
    if (!worst || dropPct > worst.dropPct) {
      worst = {
        fromLabel: prev.label,
        toLabel: curr.label,
        dropPct,
        fromCount,
        toCount,
      };
    }
  }
  return worst;
}

function aggregateCheckoutStartsByProduct(
  orders: { items: { wearProductId: string }[] }[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of orders) {
    const seen = new Set<string>();
    for (const it of o.items) {
      if (seen.has(it.wearProductId)) continue;
      seen.add(it.wearProductId);
      m.set(it.wearProductId, (m.get(it.wearProductId) ?? 0) + 1);
    }
  }
  return m;
}

export async function loadWearDashboard(range: WearDateRange): Promise<WearDashboardData> {
  const { start, end } = range;
  const now = new Date();

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = utcDayStart(now);

  const [
    eventGroups,
    paidOrders,
    checkoutOrdersInRange,
    allProducts,
    paidOrdersLast30d,
  ] = await Promise.all([
    prisma.wearAnalyticsEvent.groupBy({
      by: ["kind"],
      where: { createdAt: { gte: start, lte: end } },
      _count: { _all: true },
    }),
    prisma.wearOrder.findMany({
      where: { status: { in: [...WEAR_ORDER_PAID_LIKE] }, createdAt: { gte: start, lte: end } },
      select: {
        id: true,
        createdAt: true,
        amountTotalCents: true,
        subtotalCents: true,
        items: {
          select: {
            wearProductId: true,
            quantity: true,
            unitPriceCents: true,
            productNameSnapshot: true,
          },
        },
      },
    }),
    prisma.wearOrder.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { in: WEAR_CHECKOUT_SESSION_STATUSES },
      },
      select: {
        items: { select: { wearProductId: true } },
      },
    }),
    prisma.wearProduct.findMany({
      select: { id: true, name: true, slug: true },
    }),
    prisma.wearOrder.findMany({
      where: { status: { in: [...WEAR_ORDER_PAID_LIKE] }, createdAt: { gte: thirtyDaysAgo, lte: now } },
      select: {
        createdAt: true,
        amountTotalCents: true,
        subtotalCents: true,
      },
    }),
  ]);

  const sumPaidInWindow = (from: Date, to: Date) =>
    paidOrdersLast30d
      .filter((o) => o.createdAt >= from && o.createdAt <= to)
      .reduce((s, o) => s + revenueForOrder(o), 0);

  const revenueWindows: WearRevenueWindows = {
    todayCents: sumPaidInWindow(todayStart, now),
    last7Cents: sumPaidInWindow(sevenDaysAgo, now),
    last30Cents: paidOrdersLast30d.reduce((s, o) => s + revenueForOrder(o), 0),
  };

  const eventCount = (kind: string) => eventGroups.find((g) => g.kind === kind)?._count._all ?? 0;

  const views = eventCount(WEAR_EVENT_KINDS.productView);
  const addToCart = eventCount(WEAR_EVENT_KINDS.addToCart);
  const checkoutStartedEvents = eventCount(WEAR_EVENT_KINDS.checkoutStarted);
  const orderCount = paidOrders.length;

  const revenueCents = paidOrders.reduce((s, o) => s + revenueForOrder(o), 0);
  const aovCents = orderCount > 0 ? Math.round(revenueCents / orderCount) : null;
  const conversionViewToPurchasePct =
    views > 0 ? Math.round((orderCount / views) * 10000) / 100 : null;

  const productRevenue = new Map<string, { cents: number; orders: Set<string>; qty: number }>();
  for (const o of paidOrders) {
    for (const it of o.items) {
      const cur = productRevenue.get(it.wearProductId) ?? {
        cents: 0,
        orders: new Set<string>(),
        qty: 0,
      };
      cur.cents += it.unitPriceCents * it.quantity;
      cur.orders.add(o.id);
      cur.qty += it.quantity;
      productRevenue.set(it.wearProductId, cur);
    }
  }

  let topProduct: WearDashboardData["overview"]["topProduct"] = null;
  for (const [pid, agg] of productRevenue) {
    if (!topProduct || agg.cents > topProduct.revenueCents) {
      const p = allProducts.find((x) => x.id === pid);
      topProduct = {
        id: pid,
        name: p?.name ?? "Product",
        slug: p?.slug ?? "",
        revenueCents: agg.cents,
      };
    }
  }

  const checkoutByProduct = aggregateCheckoutStartsByProduct(checkoutOrdersInRange);

  const [productViews, productCarts] = await Promise.all([
    prisma.wearAnalyticsEvent.groupBy({
      by: ["productId"],
      where: {
        createdAt: { gte: start, lte: end },
        kind: WEAR_EVENT_KINDS.productView,
        productId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.wearAnalyticsEvent.groupBy({
      by: ["productId"],
      where: {
        createdAt: { gte: start, lte: end },
        kind: WEAR_EVENT_KINDS.addToCart,
        productId: { not: null },
      },
      _count: { _all: true },
    }),
  ]);

  const viewsByProduct = new Map(
    productViews.filter((r) => r.productId).map((r) => [r.productId as string, r._count._all]),
  );
  const cartsByProduct = new Map(
    productCarts.filter((r) => r.productId).map((r) => [r.productId as string, r._count._all]),
  );

  const productIds = new Set<string>([
    ...allProducts.map((p) => p.id),
    ...viewsByProduct.keys(),
    ...cartsByProduct.keys(),
    ...productRevenue.keys(),
    ...checkoutByProduct.keys(),
  ]);

  const topProducts: WearProductPerf[] = [];
  for (const productId of productIds) {
    const p = allProducts.find((x) => x.id === productId);
    const name = p?.name ?? "Unknown product";
    const slug = p?.slug ?? "";
    const v = viewsByProduct.get(productId) ?? 0;
    const c = cartsByProduct.get(productId) ?? 0;
    const checkoutStarted = checkoutByProduct.get(productId) ?? 0;
    const rev = productRevenue.get(productId);
    const revenueCentsP = rev?.cents ?? 0;
    const purchases = rev?.orders.size ?? 0;
    const quantitySold = rev?.qty ?? 0;
    const conversionPct =
      v > 0 ? Math.round((purchases / v) * 10000) / 100 : purchases > 0 ? null : null;

    if (v === 0 && c === 0 && checkoutStarted === 0 && revenueCentsP === 0) continue;

    topProducts.push({
      productId,
      name,
      slug,
      views: v,
      addToCart: c,
      checkoutStarted,
      purchases,
      quantitySold,
      revenueCents: revenueCentsP,
      conversionPct,
    });
  }

  topProducts.sort((a, b) => b.revenueCents - a.revenueCents);

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const dailyMap = new Map<string, number>();
  for (const o of paidOrders) {
    const k = dayKey(o.createdAt);
    dailyMap.set(k, (dailyMap.get(k) ?? 0) + revenueForOrder(o));
  }
  const dayKeys = eachUtcDayInclusive(start, end);
  const dailyRevenue: WearDailyRevenue[] = dayKeys.map((day) => ({
    day,
    cents: dailyMap.get(day) ?? 0,
  }));

  const pct = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 10000) / 100 : null;

  const funnel: WearFunnelStep[] = [
    { key: "views", label: "Product page views", count: views, pctOfPrev: null },
    {
      key: "cart",
      label: "Add to cart",
      count: addToCart,
      pctOfPrev: pct(addToCart, views),
    },
    {
      key: "checkout",
      label: "Checkout started",
      count: checkoutStartedEvents,
      pctOfPrev: pct(checkoutStartedEvents, addToCart),
    },
    {
      key: "purchase",
      label: "Purchase completed",
      count: orderCount,
      pctOfPrev: pct(orderCount, checkoutStartedEvents),
    },
  ];

  const funnelDropoff = computeFunnelDropoff(funnel);

  const insights = buildWearInsights({
    views,
    addToCart,
    checkoutStarted: checkoutStartedEvents,
    orderCount,
    revenueCents,
    conversionViewToPurchasePct,
    topProducts,
    topProduct,
    funnelDropoff,
  });

  const hasFunnelData = views + addToCart + checkoutStartedEvents > 0;
  const hasPurchases = orderCount > 0 || revenueCents > 0;
  const hasActivity = hasFunnelData || hasPurchases;

  return {
    range,
    revenueWindows,
    overview: {
      revenueCents,
      orderCount,
      aovCents,
      conversionViewToPurchasePct,
      topProduct,
    },
    funnel,
    funnelDropoff,
    topProducts,
    dailyRevenue,
    insights,
    hasActivity,
    hasFunnelData,
    hasPurchases,
  };
}

type InsightInput = {
  views: number;
  addToCart: number;
  checkoutStarted: number;
  orderCount: number;
  revenueCents: number;
  conversionViewToPurchasePct: number | null;
  topProducts: WearProductPerf[];
  topProduct: { id: string; name: string; slug: string; revenueCents: number } | null;
  funnelDropoff: WearFunnelDropoff | null;
};

export function buildWearInsights(input: InsightInput): string[] {
  const out: string[] = [];
  const {
    views,
    addToCart,
    checkoutStarted,
    orderCount,
    topProducts,
    topProduct,
    revenueCents,
    funnelDropoff,
  } = input;

  if (funnelDropoff && funnelDropoff.dropPct >= 40 && funnelDropoff.fromCount >= 5) {
    out.push(
      `Largest funnel leak: ${funnelDropoff.fromLabel} → ${funnelDropoff.toLabel} (${funnelDropoff.dropPct}% drop, ${funnelDropoff.toCount.toLocaleString()} vs ${funnelDropoff.fromCount.toLocaleString()}). Fix this step before buying more traffic.`,
    );
  }

  if (topProduct && revenueCents > 0 && topProduct.revenueCents / revenueCents >= 0.5) {
    out.push(
      `“${topProduct.name}” drives a large share of wear revenue (${Math.round((topProduct.revenueCents / revenueCents) * 100)}%). Diversify exposure and inventory so growth is not a single SKU.`,
    );
  }

  const noPurchaseViews = topProducts.filter((p) => p.views >= 10 && p.purchases === 0 && p.revenueCents === 0);
  if (noPurchaseViews.length >= 2 && views >= 30) {
    out.push(
      `${noPurchaseViews.length} products have meaningful PDP views but zero purchases in this window. Audit pricing, shipping clarity, and PDP proof (photos, variants) on those SKUs.`,
    );
  }

  for (const p of topProducts) {
    if (p.views >= 20 && p.addToCart >= 3) {
      const v2c = Math.round((p.addToCart / p.views) * 10000) / 100;
      if (v2c < 2) {
        out.push(
          `“${p.name}” gets views but rarely adds to cart (${v2c}% view→cart). Tighten the hero image, variant picker, or above-the-fold value prop.`,
        );
        break;
      }
    }
  }

  if (input.conversionViewToPurchasePct != null && views >= 40 && input.conversionViewToPurchasePct < 1) {
    out.push(
      "Overall PDP view → paid order rate is under 1%. Run one live checkout, confirm Stripe webhooks mark orders paid, then test copy and shipping expectations on the cart.",
    );
  }

  if (addToCart >= 15 && checkoutStarted < Math.max(3, addToCart * 0.2)) {
    out.push(
      "Cart-to-checkout drop-off looks severe: many adds but few checkout starts. Inspect the cart (errors, shipping messaging, required fields) before scaling ads.",
    );
  }

  if (checkoutStarted >= 8 && orderCount < checkoutStarted * 0.35) {
    out.push(
      "Many checkout sessions are not completing payment. Check Stripe decline reasons, success/cancel URLs, and whether abandoned pending orders pile up.",
    );
  }

  if (orderCount === 0 && views >= 40) {
    out.push(
      "PDP traffic without paid orders: verify webhook + order status flow with a real card test, then revisit price and trust on the PDP.",
    );
  }

  return out.slice(0, 8);
}
