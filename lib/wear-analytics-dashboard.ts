import { prisma } from "@/lib/db";
import { WEAR_EVENT_KINDS } from "@/lib/wear-event-kinds";

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

export type WearProductPerf = {
  productId: string;
  name: string;
  slug: string;
  views: number;
  addToCart: number;
  paidOrderCount: number;
  quantitySold: number;
  revenueCents: number;
  conversionViewToOrderPct: number | null;
};

export type WearDailyRevenue = { day: string; cents: number };

export type WearDashboardData = {
  range: WearDateRange;
  overview: {
    revenueCents: number;
    orderCount: number;
    aovCents: number | null;
    conversionViewToOrderPct: number | null;
    topProduct: { id: string; name: string; slug: string; revenueCents: number } | null;
  };
  funnel: WearFunnelStep[];
  topProducts: WearProductPerf[];
  dailyRevenue: WearDailyRevenue[];
  insights: string[];
  hasActivity: boolean;
};

function revenueForOrder(o: { amountTotalCents: number | null; subtotalCents: number }) {
  return o.amountTotalCents ?? o.subtotalCents;
}

export async function loadWearDashboard(range: WearDateRange): Promise<WearDashboardData> {
  const { start, end } = range;

  const [eventGroups, paidOrders, allProducts] = await Promise.all([
    prisma.wearAnalyticsEvent.groupBy({
      by: ["kind"],
      where: { createdAt: { gte: start, lte: end } },
      _count: { _all: true },
    }),
    prisma.wearOrder.findMany({
      where: { status: "paid", createdAt: { gte: start, lte: end } },
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
    prisma.wearProduct.findMany({
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const eventCount = (kind: string) =>
    eventGroups.find((g) => g.kind === kind)?._count._all ?? 0;

  const views = eventCount(WEAR_EVENT_KINDS.productView);
  const addToCart = eventCount(WEAR_EVENT_KINDS.addToCart);
  const checkoutStarted = eventCount(WEAR_EVENT_KINDS.checkoutStarted);
  const orderCount = paidOrders.length;

  const revenueCents = paidOrders.reduce((s, o) => s + revenueForOrder(o), 0);
  const aovCents = orderCount > 0 ? Math.round(revenueCents / orderCount) : null;
  const conversionViewToOrderPct =
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

  const productViews = await prisma.wearAnalyticsEvent.groupBy({
    by: ["productId"],
    where: {
      createdAt: { gte: start, lte: end },
      kind: WEAR_EVENT_KINDS.productView,
      productId: { not: null },
    },
    _count: { _all: true },
  });
  const productCarts = await prisma.wearAnalyticsEvent.groupBy({
    by: ["productId"],
    where: {
      createdAt: { gte: start, lte: end },
      kind: WEAR_EVENT_KINDS.addToCart,
      productId: { not: null },
    },
    _count: { _all: true },
  });

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
  ]);

  const topProducts: WearProductPerf[] = [];
  for (const productId of productIds) {
    const p = allProducts.find((x) => x.id === productId);
    const name = p?.name ?? "Unknown product";
    const slug = p?.slug ?? "";
    const v = viewsByProduct.get(productId) ?? 0;
    const c = cartsByProduct.get(productId) ?? 0;
    const rev = productRevenue.get(productId);
    const revenueCentsP = rev?.cents ?? 0;
    const paidOrderCount = rev?.orders.size ?? 0;
    const quantitySold = rev?.qty ?? 0;
    const conversionViewToOrderPctP =
      v > 0 ? Math.round((paidOrderCount / v) * 10000) / 100 : paidOrderCount > 0 ? null : null;

    if (v === 0 && c === 0 && revenueCentsP === 0) continue;

    topProducts.push({
      productId,
      name,
      slug,
      views: v,
      addToCart: c,
      paidOrderCount,
      quantitySold,
      revenueCents: revenueCentsP,
      conversionViewToOrderPct: conversionViewToOrderPctP,
    });
  }

  topProducts.sort((a, b) => b.revenueCents - a.revenueCents);

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const dailyMap = new Map<string, number>();
  for (const o of paidOrders) {
    const k = dayKey(o.createdAt);
    dailyMap.set(k, (dailyMap.get(k) ?? 0) + revenueForOrder(o));
  }
  const dailyRevenue: WearDailyRevenue[] = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, cents]) => ({ day, cents }));

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
      count: checkoutStarted,
      pctOfPrev: pct(checkoutStarted, addToCart),
    },
    {
      key: "purchase",
      label: "Orders paid",
      count: orderCount,
      pctOfPrev: pct(orderCount, checkoutStarted),
    },
  ];

  const insights = buildWearInsights({
    views,
    addToCart,
    checkoutStarted,
    orderCount,
    revenueCents,
    conversionViewToOrderPct,
    topProducts,
    topProduct,
  });

  const hasActivity =
    views + addToCart + checkoutStarted + orderCount > 0 || revenueCents > 0;

  return {
    range,
    overview: {
      revenueCents,
      orderCount,
      aovCents,
      conversionViewToOrderPct,
      topProduct,
    },
    funnel,
    topProducts,
    dailyRevenue,
    insights,
    hasActivity,
  };
}

type InsightInput = {
  views: number;
  addToCart: number;
  checkoutStarted: number;
  orderCount: number;
  revenueCents: number;
  conversionViewToOrderPct: number | null;
  topProducts: WearProductPerf[];
  topProduct: { id: string; name: string; slug: string; revenueCents: number } | null;
};

export function buildWearInsights(input: InsightInput): string[] {
  const out: string[] = [];
  const { views, addToCart, checkoutStarted, orderCount, topProducts, topProduct, revenueCents } =
    input;

  if (views >= 30 && input.conversionViewToOrderPct != null && input.conversionViewToOrderPct < 1.5) {
    out.push(
      "Overall conversion from PDP views to paid orders is very low. Prioritize clearer pricing, shipping expectations, and PDP trust (returns, delivery).",
    );
  }

  if (addToCart >= 20 && checkoutStarted < addToCart * 0.25) {
    out.push(
      "A large share of “add to cart” never reaches checkout. Audit the cart page (shipping note, friction, errors) before spending on more traffic.",
    );
  }

  if (checkoutStarted >= 10 && orderCount < checkoutStarted * 0.35) {
    out.push(
      "Drop-off after checkout start is high. Confirm Stripe success URLs, test a real checkout, and check for payment declines or abandonment.",
    );
  }

  if (topProduct && revenueCents > 0 && topProduct.revenueCents / revenueCents >= 0.55) {
    out.push(
      `“${topProduct.name}” drives most wear revenue. Plan inventory and marketing so the catalog is not a single-point failure.`,
    );
  }

  const withViews = topProducts.filter((p) => p.views >= 15);
  for (const p of withViews) {
    if (p.conversionViewToOrderPct != null && p.conversionViewToOrderPct < 0.8 && p.views >= 25) {
      out.push(
        `“${p.name}” gets meaningful views but weak order conversion. Refresh images, variant clarity, or price vs. perceived value.`,
      );
      break;
    }
  }

  if (orderCount === 0 && views >= 50) {
    out.push("You have PDP traffic but no completed orders in this window. Run one full test purchase and verify webhooks mark orders paid.");
  }

  return out.slice(0, 6);
}
