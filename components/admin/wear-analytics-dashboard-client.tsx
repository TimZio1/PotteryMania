"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";
import type { WearDashboardData, WearFunnelDropoff, WearFunnelStep } from "@/lib/wear-analytics-dashboard";

export type WearDashboardClientProps = Omit<WearDashboardData, "range"> & {
  range: { label: string; preset: string; startISO: string; endISO: string };
};

function eur(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(cents / 100);
}

type SortKey = "revenue" | "purchases" | "conversion" | "views";

function FunnelBlock({
  steps,
  dropoff,
}: {
  steps: WearFunnelStep[];
  dropoff: WearFunnelDropoff | null;
}) {
  const max = Math.max(...steps.map((s) => s.count), 1);
  return (
    <div className="space-y-6">
      {dropoff && dropoff.dropPct > 0 && dropoff.fromCount > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Biggest drop-off</p>
          <p className="mt-1 text-amber-900/90">
            {dropoff.fromLabel} → {dropoff.toLabel}:{" "}
            <span className="font-mono font-semibold">{dropoff.dropPct}%</span> left the funnel (
            <span className="font-mono">{dropoff.toCount.toLocaleString()}</span> of{" "}
            <span className="font-mono">{dropoff.fromCount.toLocaleString()}</span>).
          </p>
        </div>
      ) : null}
      <div className="space-y-4">
        {steps.map((s, i) => {
          const w = Math.max(8, Math.round((s.count / max) * 100));
          return (
            <div key={s.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-stone-900">{s.label}</span>
                <span className="font-mono text-sm text-stone-900">
                  {s.count.toLocaleString()}
                  {s.pctOfPrev != null ? (
                    <span className="ml-2 text-stone-600">
                      ({s.pctOfPrev}% from previous
                      {steps[i - 1] ? ` · prior ${steps[i - 1]!.count.toLocaleString()}` : ""})
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-amber-700/90 transition-[width]"
                  style={{ width: `${w}%` }}
                  title={`${s.count}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineChart({ points }: { points: { day: string; cents: number }[] }) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-stone-600">
        No days in this range — pick a wider window to see revenue by day.
      </p>
    );
  }
  const hasRevenue = points.some((p) => p.cents > 0);
  if (!hasRevenue) {
    return (
      <p className="text-sm text-stone-600">
        No paid orders in this window — revenue by day will appear after the first completed checkout.
      </p>
    );
  }
  const max = Math.max(...points.map((p) => p.cents), 1);
  const w = 640;
  const h = 140;
  const padX = 12;
  const padY = 10;
  const step = points.length > 1 ? (w - padX * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = padX + i * step;
    const y = h - padY - (p.cents / max) * (h - padY * 2);
    return `${x},${y}`;
  });
  const d = points.length > 1 ? `M ${coords.join(" L ")}` : `M ${padX},${h / 2} L ${w - padX},${h / 2}`;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h + 28}`}
        className="h-auto w-full max-w-full text-amber-800"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Revenue over time"
      >
        <line
          x1={padX}
          y1={h - padY}
          x2={w - padX}
          y2={h - padY}
          stroke="currentColor"
          strokeOpacity={0.2}
        />
        <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => {
          const x = padX + i * step;
          const y = h - padY - (p.cents / max) * (h - padY * 2);
          return <circle key={p.day} cx={x} cy={y} r={3} fill="currentColor" />;
        })}
        <text x={padX} y={h + 18} className="fill-stone-500 text-[11px]">
          {points[0]?.day} → {points[points.length - 1]?.day} (UTC, paid orders)
        </text>
      </svg>
    </div>
  );
}

export default function WearAnalyticsDashboardClient(props: WearDashboardClientProps) {
  const [sort, setSort] = useState<SortKey>("revenue");

  const sortedProducts = useMemo(() => {
    const list = [...props.topProducts];
    if (sort === "revenue") {
      list.sort((a, b) => b.revenueCents - a.revenueCents);
    } else if (sort === "purchases") {
      list.sort((a, b) => b.purchases - a.purchases);
    } else if (sort === "conversion") {
      list.sort((a, b) => {
        const ca = a.conversionPct ?? -1;
        const cb = b.conversionPct ?? -1;
        return cb - ca;
      });
    } else {
      list.sort((a, b) => b.views - a.views);
    }
    return list;
  }, [props.topProducts, sort]);

  const {
    overview,
    funnel,
    funnelDropoff,
    dailyRevenue,
    insights,
    hasActivity,
    hasFunnelData,
    hasPurchases,
    revenueWindows,
    range,
    integrationSignals,
  } = props;

  const qp = (r: string, extra?: Record<string, string>) => {
    const u = new URLSearchParams();
    u.set("range", r);
    if (extra) Object.entries(extra).forEach(([k, v]) => u.set(k, v));
    return `/admin/wear-analytics?${u.toString()}`;
  };

  return (
    <div className="mt-8 space-y-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Report period</p>
          <p className="mt-1 text-sm text-stone-600">
            {range.label}
            <span className="ml-2 font-mono text-xs text-stone-400">
              {range.startISO.slice(0, 10)} → {range.endISO.slice(0, 10)}
            </span>
          </p>
          <p className="mt-1 text-xs text-stone-600">
            Funnel, table, and chart below use this range. Revenue strip uses rolling calendar windows (UTC).
          </p>
          {(integrationSignals.spreadconnectFailures > 0 || integrationSignals.metaCapiErrors > 0) && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
              <p className="font-semibold">Integration signals (this range)</p>
              <ul className="mt-1 list-inside list-disc text-amber-900/90">
                {integrationSignals.spreadconnectFailures > 0 ? (
                  <li>
                    Spreadconnect submit failures logged:{" "}
                    <span className="font-mono">{integrationSignals.spreadconnectFailures}</span> (
                    <code className="text-[11px]">wear_spreadconnect_failed</code>)
                  </li>
                ) : null}
                {integrationSignals.metaCapiErrors > 0 ? (
                  <li>
                    Meta CAPI errors: <span className="font-mono">{integrationSignals.metaCapiErrors}</span> (
                    <code className="text-[11px]">meta_capi_error</code>)
                  </li>
                ) : null}
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={qp("today")}
            className={cn(ui.buttonGhost, range.preset === "today" && "bg-amber-100/80")}
          >
            Today
          </Link>
          <Link href={qp("7d")} className={cn(ui.buttonGhost, range.preset === "7d" && "bg-amber-100/80")}>
            7 days
          </Link>
          <Link
            href={qp("30d")}
            className={cn(ui.buttonGhost, range.preset === "30d" && "bg-amber-100/80")}
          >
            30 days
          </Link>
        </div>
        <form method="get" action="/admin/wear-analytics" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="range" value="custom" />
          <div>
            <label className="text-xs text-stone-600">From</label>
            <input
              type="date"
              name="from"
              defaultValue={range.preset === "custom" ? range.startISO.slice(0, 10) : ""}
              className="mt-1 block rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-stone-600">To</label>
            <input
              type="date"
              name="to"
              defaultValue={range.preset === "custom" ? range.endISO.slice(0, 10) : ""}
              className="mt-1 block rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className={ui.buttonSecondary}>
            Apply
          </button>
        </form>
      </div>

      {!hasActivity ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 px-6 py-14 text-center">
          <p className="text-lg font-medium text-stone-900">No activity in this period</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
            No PDP events or paid orders yet. Send traffic to{" "}
            <Link href="/wear/shop" className="font-medium text-amber-900 underline">
              /wear/shop
            </Link>{" "}
            or widen the date range.
          </p>
        </div>
      ) : null}

      {hasActivity ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">Overview</h2>
          <p className="mt-1 max-w-3xl text-sm text-stone-600">
            Rolling revenue helps you compare momentum; other KPIs match the report period above.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-stone-600">Revenue · today (UTC)</p>
              <p className="mt-1 text-xl font-semibold text-stone-900">{eur(revenueWindows.todayCents)}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-stone-600">Revenue · last 7 days</p>
              <p className="mt-1 text-xl font-semibold text-stone-900">{eur(revenueWindows.last7Cents)}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-stone-600">Revenue · last 30 days</p>
              <p className="mt-1 text-xl font-semibold text-stone-900">{eur(revenueWindows.last30Cents)}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-stone-600">Revenue · this period</p>
              <p className="mt-1 text-2xl font-semibold text-stone-900">{eur(overview.revenueCents)}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-stone-600">Orders · this period</p>
              <p className="mt-1 text-2xl font-semibold text-stone-900">{overview.orderCount}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-stone-600">Avg. order value</p>
              <p className="mt-1 text-2xl font-semibold text-stone-900">
                {overview.aovCents != null ? eur(overview.aovCents) : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-stone-600">Conversion · view → purchase</p>
              <p className="mt-1 text-2xl font-semibold text-stone-900">
                {overview.conversionViewToPurchasePct != null
                  ? `${overview.conversionViewToPurchasePct}%`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-stone-600">Top product by revenue · this period</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">
              {overview.topProduct ? overview.topProduct.name : "—"}
            </p>
            {overview.topProduct ? (
              <p className="mt-1 font-mono text-xs text-stone-600">{eur(overview.topProduct.revenueCents)}</p>
            ) : (
              <p className="mt-1 text-sm text-stone-600">No paid line items in this window.</p>
            )}
          </div>
        </section>
      ) : null}

      {hasActivity ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Funnel</h2>
              <p className="mt-1 max-w-2xl text-sm text-stone-600">
                PDP events and checkout-start beacons, ending in paid orders. Percentages are step-to-step carry-over.
              </p>
            </div>
          </div>
          <div className="mt-8 max-w-2xl">
            {!hasFunnelData ? (
              <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-8 text-center text-sm text-stone-600">
                No funnel events in this period yet (views, add to cart, checkout started). Purchases may still appear
                if orders were recorded without matching events.
              </div>
            ) : (
              <FunnelBlock steps={funnel} dropoff={funnelDropoff} />
            )}
          </div>
        </section>
      ) : null}

      {insights.length > 0 ? (
        <section className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-6">
          <h2 className="text-lg font-semibold text-stone-900">Insights</h2>
          <p className="mt-1 text-sm text-stone-600">Rule-based, actionable signals from metrics in this report.</p>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-stone-900">
            {insights.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      ) : hasActivity ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
          No strong rule-based signals for this window. Collect more events or widen the range.
        </section>
      ) : null}

      {hasActivity ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Revenue over time</h2>
          <p className="mt-1 text-sm text-stone-600">Paid orders by calendar day (UTC), for the report period.</p>
          <div className="mt-6">
            {!hasPurchases ? (
              <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-8 text-center text-sm text-stone-600">
                No purchases in this period — chart will fill after the first paid wear order.
              </div>
            ) : (
              <LineChart points={dailyRevenue} />
            )}
          </div>
        </section>
      ) : null}

      {hasActivity ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Top products</h2>
              <p className="mt-1 max-w-2xl text-sm text-stone-600">
                Checkout started = sessions (pending or paid orders) that included the product. Purchases = paid orders
                containing the product. Conversion = purchases ÷ PDP views when views are tracked with{" "}
                <code className="rounded bg-stone-100 px-1 text-xs">productId</code>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-600">Sort</span>
              {(
                [
                  ["revenue", "Revenue"],
                  ["purchases", "Purchases"],
                  ["conversion", "Conversion"],
                  ["views", "Views"],
                ] as const
              ).map(([k, lab]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSort(k)}
                  className={cn(
                    ui.buttonGhost,
                    "min-h-9 px-3 text-xs",
                    sort === k && "bg-amber-100/90 font-medium",
                  )}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>
          {sortedProducts.length === 0 ? (
            <p className="mt-8 text-sm text-stone-600">
              No product-level rows for this window (no views, cart events, checkout sessions, or revenue).
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-stone-200 text-xs font-semibold uppercase tracking-wide text-stone-600">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">Views</th>
                    <th className="px-3 py-2 text-right">Add to cart</th>
                    <th className="px-3 py-2 text-right">Checkout started</th>
                    <th className="px-3 py-2 text-right">Purchases</th>
                    <th className="px-3 py-2 text-right">Conversion</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.map((p) => (
                    <tr key={p.productId} className="border-b border-stone-100 last:border-0">
                      <td className="px-3 py-3">
                        {p.slug ? (
                          <Link
                            href={`/wear/${p.slug}`}
                            className="font-medium text-amber-900 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {p.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-stone-900">{p.name}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">{p.views}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs">{p.addToCart}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs">{p.checkoutStarted}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs">{p.purchases}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        {p.conversionPct != null ? `${p.conversionPct}%` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">{eur(p.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
