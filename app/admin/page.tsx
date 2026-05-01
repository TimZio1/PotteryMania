import Link from "next/link";
import { redirect } from "next/navigation";
import type { WearOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { cn } from "@/lib/cn";
import { loadWearCatalogValueSnapshot } from "@/lib/wear-spreadconnect-stats";
import { formatWearMoney } from "@/lib/wear-money";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Home",
  "/admin",
  "Platform overview: wear revenue, catalog health, and what needs your attention.",
);

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdminUser();
  if (!user) {
    redirect("/unauthorized-admin");
  }
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = startOfDay(new Date(now.getTime() - DAY_MS));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const last30Start = startOfDay(new Date(now.getTime() - 29 * DAY_MS));
  const last60Start = startOfDay(new Date(now.getTime() - 59 * DAY_MS));
  return (
    <AdminApparelOnlyDashboard
      now={now}
      todayStart={todayStart}
      yesterdayStart={yesterdayStart}
      monthStart={monthStart}
      last30Start={last30Start}
      last60Start={last60Start}
    />
  );
}

const PAID_WEAR_ORDER_STATUSES: WearOrderStatus[] = ["paid", "in_production", "fulfilled", "shipped"];

async function AdminApparelOnlyDashboard({
  todayStart,
  yesterdayStart,
  monthStart,
  last30Start,
  last60Start,
}: {
  now: Date;
  todayStart: Date;
  yesterdayStart: Date;
  monthStart: Date;
  last30Start: Date;
  last60Start: Date;
}) {
  const [
    wearOrdersLast60,
    activeProductsCount,
    totalProductsCount,
    affiliateCount,
    enabledAffiliateCount,
    unreadInboxCount,
    pendingOrderCount,
    activePipelineCount,
    shippedOrderCount,
  ] = await Promise.all([
    prisma.wearOrder.findMany({
      where: { createdAt: { gte: last60Start } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        status: true,
        customerEmail: true,
        customerName: true,
        subtotalCents: true,
        amountTotalCents: true,
        studioId: true,
        studioMarginCents: true,
        platformRevenueCents: true,
      },
    }),
    prisma.wearProduct.count({ where: { isActive: true, archivedAt: null, publishStatus: "published" } }),
    prisma.wearProduct.count(),
    prisma.studioWearConfig.count(),
    prisma.studioWearConfig.count({ where: { enabled: true } }),
    prisma.adminInboxMessage.count({ where: { direction: "inbound", readAt: null, deletedAt: null } }),
    prisma.wearOrder.count({ where: { status: "pending" } }),
    prisma.wearOrder.count({ where: { status: { in: ["paid", "manual_review", "in_production"] } } }),
    prisma.wearOrder.count({ where: { status: "shipped" } }),
  ]);

  let wearCatalogValue: Awaited<ReturnType<typeof loadWearCatalogValueSnapshot>> | null = null;
  try {
    wearCatalogValue = await loadWearCatalogValueSnapshot();
  } catch (err) {
    console.error("[admin] wear catalog value snapshot failed", err);
  }

  const paidWearOrders = wearOrdersLast60.filter((order) => PAID_WEAR_ORDER_STATUSES.includes(order.status));
  const paidWearOrdersMonth = paidWearOrders.filter((order) => order.createdAt >= monthStart);
  const paidWearOrdersToday = paidWearOrders.filter((order) => order.createdAt >= todayStart);
  const paidWearOrdersYesterday = paidWearOrders.filter(
    (order) => order.createdAt >= yesterdayStart && order.createdAt < todayStart,
  );
  const paidWearOrdersPrevious30 = paidWearOrders.filter(
    (order) => order.createdAt >= last60Start && order.createdAt < last30Start,
  );
  const currentWearOrders30 = wearOrdersLast60.filter((order) => order.createdAt >= last30Start);
  const failedWearOrders30 = currentWearOrders30.filter((order) => order.status === "cancelled" || order.status === "refunded");
  const buyerKeys = new Set(paidWearOrdersMonth.map((order) => customerKey(order.customerEmail, order.customerName)));

  const grossRevenueTodayCents = sumBy(paidWearOrdersToday, wearOrderTotalCents);
  const grossRevenueYesterdayCents = sumBy(paidWearOrdersYesterday, wearOrderTotalCents);
  const grossRevenueMonthCents = sumBy(paidWearOrdersMonth, wearOrderTotalCents);
  const grossRevenuePrevious30Cents = sumBy(paidWearOrdersPrevious30, wearOrderTotalCents);
  const affiliateCommissionMonthCents = sumBy(paidWearOrdersMonth, (order) => order.studioMarginCents ?? 0);
  const platformRevenueMonthCents = sumBy(
    paidWearOrdersMonth,
    (order) => order.platformRevenueCents ?? Math.max(0, order.subtotalCents - (order.studioMarginCents ?? 0)),
  );
  const affiliateSalesMonth = paidWearOrdersMonth.filter((order) => order.studioId).length;
  const directSalesMonth = paidWearOrdersMonth.length - affiliateSalesMonth;
  const averageOrderValueCents =
    paidWearOrdersMonth.length > 0 ? Math.round(grossRevenueMonthCents / paidWearOrdersMonth.length) : 0;
  const affiliateShare = paidWearOrdersMonth.length > 0 ? affiliateSalesMonth / paidWearOrdersMonth.length : 0;

  const revenueTrend = buildTrend(currentWearOrders30, last30Start, (order) =>
    PAID_WEAR_ORDER_STATUSES.includes(order.status) ? wearOrderTotalCents(order) / 100 : 0,
  );
  const orderTrend = buildTrend(currentWearOrders30, last30Start, (order) =>
    PAID_WEAR_ORDER_STATUSES.includes(order.status) ? 1 : 0,
  );

  const navCards = [
    { href: "/admin/wear-products", title: "Products", desc: "T-shirts, hoodies, Spreadconnect sync, supply cost." },
    { href: "/admin/wear-orders", title: "Orders", desc: "Apparel checkout, fulfillment, shipping, refunds." },
    { href: "/admin/affiliates", title: "Affiliates", desc: "Approve partners, issue codes, track commission." },
    { href: "/admin/coupons", title: "Coupons", desc: "% / fixed / 3+1 promos with margin safety." },
    { href: "/admin/notifications", title: "Inbox", desc: "Support, affiliate, and legal emails." },
    { href: "/admin/users", title: "Customers", desc: "Customer records, profile edits, account status." },
    { href: "/admin/wear-analytics", title: "Analytics", desc: "AOV, SKU mix, apparel performance." },
    { href: "/admin/revenue", title: "Revenue", desc: "Sales, refunds, and payout visibility." },
    { href: "/admin/settings", title: "Settings", desc: "Apparel pricing, affiliate rate, system rules." },
  ] as const;

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Apparel admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            T-shirt sales and affiliate control.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Only the tools needed to run the PotteryMania apparel store are shown here: products, orders,
            customers, inbox, coupons, revenue, and affiliates.
          </p>
        </div>
        <Link
          href="/wear/shop"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 text-sm font-medium text-stone-800 transition hover:border-amber-400"
        >
          View live shop
        </Link>
      </div>

      {unreadInboxCount > 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <Link href="/admin/notifications" className="font-semibold underline-offset-2 hover:underline">
            {unreadInboxCount} unread email{unreadInboxCount === 1 ? "" : "s"}
          </Link>
          <span className="text-amber-900/90"> in the operator inbox.</span>
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue today"
          value={formatCurrency(grossRevenueTodayCents)}
          delta={deltaText(grossRevenueTodayCents, grossRevenueYesterdayCents, "vs yesterday")}
          tone={grossRevenueTodayCents >= grossRevenueYesterdayCents ? "good" : "warn"}
        />
        <KpiCard
          label="Revenue this month"
          value={formatCurrency(grossRevenueMonthCents)}
          delta={deltaText(grossRevenueMonthCents, grossRevenuePrevious30Cents, "vs prior 30 days")}
          tone={grossRevenueMonthCents >= grossRevenuePrevious30Cents ? "good" : "warn"}
        />
        <KpiCard label="Affiliate commission" value={formatCurrency(affiliateCommissionMonthCents)} delta="This month" />
        <KpiCard label="Average order value" value={formatCurrency(averageOrderValueCents)} delta="Paid apparel orders" />
        <KpiCard label="Paid orders" value={formatCompactNumber(paidWearOrdersMonth.length)} delta={`${directSalesMonth} direct · ${affiliateSalesMonth} affiliate`} />
        <KpiCard label="Affiliate share" value={formatPercent(affiliateShare)} delta={`${enabledAffiliateCount} active affiliates`} />
        <KpiCard label="Active products" value={`${activeProductsCount}/${totalProductsCount}`} delta="Live apparel catalog" />
        <KpiCard label="Pipeline orders" value={formatCompactNumber(activePipelineCount)} delta={`${pendingOrderCount} pending · ${shippedOrderCount} shipped`} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <TrendPanel title="Revenue (last 30 days)" subtitle="Paid apparel order volume" data={revenueTrend} prefix="€" />
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">Money this month</p>
          <dl className="mt-6 space-y-5">
            <MetricLine label="Gross apparel revenue" value={formatCurrency(grossRevenueMonthCents)} />
            <MetricLine label="Platform revenue" value={formatCurrency(platformRevenueMonthCents)} />
            <MetricLine label="Affiliate commission" value={formatCurrency(affiliateCommissionMonthCents)} />
            <MetricLine label="Active affiliates" value={String(enabledAffiliateCount)} />
            <MetricLine label="Customers this month" value={String(buyerKeys.size)} />
            <MetricLine label="Closed / failed orders" value={String(failedWearOrders30.length)} />
          </dl>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        <TrendPanel title="Orders" subtitle="Paid apparel orders per day" data={orderTrend} />
        <ActionPanel
          title="Affiliate program"
          detail={`${enabledAffiliateCount} active of ${affiliateCount} total affiliates. Default public promise is 15% commission, 30-day cookie, automatic Stripe payout above €50.`}
          href="/admin/affiliates"
          cta="Manage affiliates"
        />
        <ActionPanel
          title="Order operations"
          detail={`${activePipelineCount} orders are paid/manual/in production and need operational visibility.`}
          href="/admin/wear-orders"
          cta="Open orders"
        />
      </section>

      {wearCatalogValue ? (
        <section
          aria-label="Spreadconnect catalog value"
          className="mt-10 rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-stone-50 p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                Spreadconnect · catalog value
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-amber-950">
                Live apparel catalog value.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-stone-600">
                Sum of one saleable unit per variant. Use it to sanity-check promos, costs, and margin.
              </p>
            </div>
            <Link
              href="/admin/wear-products"
              className="rounded-full border border-amber-900/30 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900 transition hover:bg-amber-50"
            >
              Products
            </Link>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CatalogMetric label="Catalog value" value={formatWearMoney(wearCatalogValue.totalCatalogValueCents, wearCatalogValue.currency)} note="List price × 1 unit per variant" tone="amber" />
            <CatalogMetric label="Catalog cost" value={formatWearMoney(wearCatalogValue.totalCatalogCostCents, wearCatalogValue.currency)} note="Spreadconnect supply cost or floor" />
            <CatalogMetric label="Estimated margin" value={formatWearMoney(wearCatalogValue.totalCatalogMarginCents, wearCatalogValue.currency)} note="Pre-discount, per unit" tone="emerald" />
            <CatalogMetric label="Spreadconnect linked" value={`${wearCatalogValue.spreadconnectLinkedProducts}/${wearCatalogValue.totalProducts}`} note={`${wearCatalogValue.activeProducts} active · ${wearCatalogValue.totalVariants} variants`} tone="sky" />
          </dl>
        </section>
      ) : null}

      <section className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Jump to</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Apparel launch sections
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Wear catalog, checkout, affiliates, and operator tools — scoped to the live storefront.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {navCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={cn(
                "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-900/25 hover:shadow-md",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900",
              )}
            >
              <p className="font-semibold text-[var(--foreground)]">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.desc}</p>
              <p className="mt-4 text-xs font-medium text-amber-800">Open →</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sumBy<T>(rows: T[], selector: (row: T) => number) {
  return rows.reduce((sum, row) => sum + selector(row), 0);
}

function wearOrderTotalCents(order: { amountTotalCents: number | null; subtotalCents: number }) {
  return order.amountTotalCents ?? order.subtotalCents;
}

function KpiCard({
  label,
  value,
  delta,
  tone = "default",
}: {
  label: string;
  value: string;
  delta: string;
  tone?: "default" | "good" | "warn" | "danger";
}) {
  return (
    <article className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-600">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-amber-950">{value}</p>
      <p
        className={`mt-2 text-xs font-medium ${
          tone === "danger"
            ? "text-red-700"
            : tone === "warn"
              ? "text-amber-700"
              : tone === "good"
                ? "text-emerald-700"
                : "text-stone-600"
        }`}
      >
        {delta}
      </p>
    </article>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-200/70 pb-4 last:border-b-0 last:pb-0">
      <dt className="text-sm text-stone-600">{label}</dt>
      <dd className="text-lg font-semibold tracking-tight text-amber-950">{value}</dd>
    </div>
  );
}

function TrendPanel({
  title,
  subtitle,
  data,
  prefix = "",
}: {
  title: string;
  subtitle: string;
  data: Array<{ label: string; value: number }>;
  prefix?: string;
}) {
  const max = Math.max(...data.map((point) => point.value), 1);
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-amber-950">{title}</p>
      <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
      <div className="mt-6 flex h-48 items-end gap-2">
        {data.map((point) => {
          const height = Math.max(10, Math.round((point.value / max) * 100));
          return (
            <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="text-[11px] font-medium text-stone-600">
                {prefix}
                {Math.round(point.value).toLocaleString("en")}
              </div>
              <div className="w-full rounded-full bg-stone-100" style={{ height: `${height}%` }}>
                <div
                  className="h-full w-full rounded-full bg-[linear-gradient(180deg,#c38962_0%,#6d4530_100%)]"
                  aria-hidden
                />
              </div>
              <div className="text-[11px] text-stone-500">{point.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActionPanel({
  title,
  detail,
  href,
  cta,
}: {
  title: string;
  detail: string;
  href: string;
  cta: string;
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-amber-950">{title}</p>
      <p className="mt-3 text-sm leading-6 text-stone-600">{detail}</p>
      <Link
        href={href}
        className="mt-6 inline-flex min-h-11 items-center rounded-full border border-amber-900/30 px-4 text-sm font-medium text-amber-900 transition hover:bg-amber-50"
      >
        {cta} →
      </Link>
    </section>
  );
}

function CatalogMetric({
  label,
  value,
  note,
  tone = "stone",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "stone" | "amber" | "emerald" | "sky";
}) {
  const colors = {
    stone: "border-stone-200 text-stone-800",
    amber: "border-amber-200 text-amber-950",
    emerald: "border-emerald-200 text-emerald-800",
    sky: "border-sky-200 text-sky-900",
  }[tone];
  return (
    <div className={`rounded-2xl border bg-white px-5 py-4 shadow-sm ${colors}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</dt>
      <dd className="mt-2 text-3xl font-semibold tracking-tight">{value}</dd>
      <p className="mt-1 text-[11px] text-stone-500">{note}</p>
    </div>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function deltaText(current: number, previous: number, suffix: string) {
  if (previous <= 0) {
    return current > 0 ? `New activity ${suffix}` : `No change ${suffix}`;
  }
  const delta = ((current - previous) / previous) * 100;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}% ${suffix}`;
}

function customerKey(email: string, name: string) {
  return `${email.toLowerCase()}::${name.trim().toLowerCase()}`;
}

function buildTrend<T extends { createdAt: Date }>(
  rows: T[],
  start: Date,
  valueSelector: (row: T) => number
) {
  const buckets = new Map<string, number>();
  for (let i = 0; i < 30; i += 1) {
    const date = new Date(start.getTime() + i * DAY_MS);
    buckets.set(date.toISOString().slice(5, 10), 0);
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(5, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + valueSelector(row));
    }
  }
  return [...buckets.entries()].map(([label, value]) => ({ label, value }));
}


