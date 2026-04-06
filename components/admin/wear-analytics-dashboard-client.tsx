"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";
import type { WearDashboardData, WearFunnelStep, WearProductPerf } from "@/lib/wear-analytics-dashboard";

export type WearDashboardClientProps = Omit<WearDashboardData, "range"> & {
  range: { label: string; preset: string; startISO: string; endISO: string };
};

function eur(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(cents / 100);
}

type SortKey = "revenue" | "conversion" | "engagement";

function engagementScore(p: WearProductPerf) {
  return p.views + p.addToCart * 2 + p.paidOrderCount * 10;
}

function FunnelBlock({ steps }: { steps: WearFunnelStep[] }) {
  const max = Math.max(...steps.map((s) => s.count), 1);
  return (
    <div className="space-y-4">
      {steps.map((s, i) => {
        const w = Math.max(8, Math.round((s.count / max) * 100));
        return (
          <div key={s.key}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-amber-950">{s.label}</span>
              <span className="font-mono text-sm text-stone-700">
                {s.count.toLocaleString()}
                {s.pctOfPrev != null ? (
                  <span className="ml-2 text-stone-500">
                    ({s.pctOfPrev}% of previous{steps[i - 1] ? ` · was ${steps[i - 1].count.toLocaleString()}` : ""})
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
  );
}

function LineChart({ points }: { points: { day: string; cents: number }[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-stone-500">No paid orders in this window — no revenue curve yet.</p>;
  }
  const max = Math.max(...points.map((p) => p.cents), 1);
  const w = 320;
  const h = 120;
  const pad = 8;
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = h - pad - (p.cents / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  const d = points.length > 1 ? `M ${coords.join(" L ")}` : `M ${pad},${h / 2} L ${w - pad},${h / 2}`;

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h + 24} className="text-amber-800" aria-label="Revenue over time">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" strokeOpacity={0.2} />
        <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => {
          const x = pad + i * step;
          const y = h - pad - (p.cents / max) * (h - pad * 2);
          return <circle key={p.day} cx={x} cy={y} r={3} fill="currentColor" />;
        })}
        <text x={pad} y={h + 16} className="fill-stone-500 text-[10px]">
          {points[0]?.day} → {points[points.length - 1]?.day}
        </text>
      </svg>
    </div>
  );
}

function BarProducts({ rows }: { rows: WearProductPerf[] }) {
  const top = rows.slice(0, 8);
  if (top.length === 0) {
    return <p className="text-sm text-stone-500">No product-level revenue in this window.</p>;
  }
  const max = Math.max(...top.map((r) => r.revenueCents), 1);
  return (
    <ul className="space-y-3" aria-label="Top products by revenue">
      {top.map((r) => (
        <li key={r.productId} className="flex items-center gap-3">
          <span className="w-36 shrink-0 truncate text-xs font-medium text-stone-800" title={r.name}>
            {r.name}
          </span>
          <div className="h-6 min-w-0 flex-1 overflow-hidden rounded bg-stone-200">
            <div
              className="h-full bg-amber-600/85"
              style={{ width: `${Math.max(4, (r.revenueCents / max) * 100)}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-right font-mono text-xs text-stone-600">{eur(r.revenueCents)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function WearAnalyticsDashboardClient(props: WearDashboardClientProps) {
  const [sort, setSort] = useState<SortKey>("revenue");

  const barRows = useMemo(
    () => [...props.topProducts].sort((a, b) => b.revenueCents - a.revenueCents),
    [props.topProducts],
  );

  const sortedProducts = useMemo(() => {
    const list = [...props.topProducts];
    if (sort === "revenue") {
      list.sort((a, b) => b.revenueCents - a.revenueCents);
    } else if (sort === "conversion") {
      list.sort((a, b) => {
        const ca = a.conversionViewToOrderPct ?? -1;
        const cb = b.conversionViewToOrderPct ?? -1;
        return cb - ca;
      });
    } else {
      list.sort((a, b) => engagementScore(b) - engagementScore(a));
    }
    return list;
  }, [props.topProducts, sort]);

  const { overview, funnel, dailyRevenue, insights, hasActivity, range } = props;

  const qp = (r: string, extra?: Record<string, string>) => {
    const u = new URLSearchParams();
    u.set("range", r);
    if (extra) Object.entries(extra).forEach(([k, v]) => u.set(k, v));
    return `/admin/wear-analytics?${u.toString()}`;
  };

  return (
    <div className="mt-8 space-y-12">
      {/* Time filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Time window</p>
          <p className="mt-1 text-sm text-stone-600">
            {range.label}
            <span className="ml-2 font-mono text-xs text-stone-400">
              {range.startISO.slice(0, 10)} → {range.endISO.slice(0, 10)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={qp("today")}
            className={cn(ui.buttonGhost, range.preset === "today" && "bg-amber-100/80")}
          >
            Today
          </Link>
          <Link
            href={qp("7d")}
            className={cn(ui.buttonGhost, range.preset === "7d" && "bg-amber-100/80")}
          >
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
            <label className="text-xs text-stone-500">From</label>
            <input
              type="date"
              name="from"
              defaultValue={range.preset === "custom" ? range.startISO.slice(0, 10) : ""}
              className="mt-1 block rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500">To</label>
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
          <p className="text-lg font-medium text-amber-950">No activity yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
            Start driving traffic to <Link href="/wear/shop" className="font-medium text-amber-900 underline">/wear/shop</Link>.
            Events and paid orders will populate this dashboard automatically.
          </p>
        </div>
      ) : null}

      {/* Overview */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Overview</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-stone-500">Revenue</p>
            <p className="mt-1 text-2xl font-semibold text-amber-950">{eur(overview.revenueCents)}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-stone-500">Paid orders</p>
            <p className="mt-1 text-2xl font-semibold text-amber-950">{overview.orderCount}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-stone-500">Avg. order value</p>
            <p className="mt-1 text-2xl font-semibold text-amber-950">
              {overview.aovCents != null ? eur(overview.aovCents) : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-stone-500">View → order</p>
            <p className="mt-1 text-2xl font-semibold text-amber-950">
              {overview.conversionViewToOrderPct != null ? `${overview.conversionViewToOrderPct}%` : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
            <p className="text-xs text-stone-500">Top product (revenue)</p>
            <p className="mt-1 line-clamp-2 text-lg font-semibold leading-snug text-amber-950">
              {overview.topProduct ? overview.topProduct.name : "—"}
            </p>
            {overview.topProduct ? (
              <p className="mt-1 font-mono text-xs text-stone-600">{eur(overview.topProduct.revenueCents)}</p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Funnel */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-amber-950">Funnel</h2>
            <p className="mt-1 max-w-xl text-sm text-stone-600">
              Event counts vs. paid orders. Percentages show carry-over from the step above — use them to see where you
              lose people.
            </p>
          </div>
        </div>
        <div className="mt-8 max-w-2xl">
          <FunnelBlock steps={funnel} />
        </div>
      </section>

      {/* Insights */}
      {insights.length > 0 ? (
        <section className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-6">
          <h2 className="text-lg font-semibold text-amber-950">What to do next</h2>
          <p className="mt-1 text-sm text-stone-600">Rule-based signals from this window — not predictions.</p>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-stone-800">
            {insights.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      ) : hasActivity ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
          No strong automated signals for this window. Keep collecting data or widen the date range.
        </section>
      ) : null}

      {/* Charts row */}
      {hasActivity ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-amber-950">Revenue over time</h2>
            <p className="mt-1 text-sm text-stone-600">Paid orders only, by day (UTC).</p>
            <div className="mt-6">
              <LineChart points={dailyRevenue} />
            </div>
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-amber-950">Top products</h2>
            <p className="mt-1 text-sm text-stone-600">Revenue in this window.</p>
            <div className="mt-6">
              <BarProducts rows={barRows} />
            </div>
          </section>
        </div>
      ) : null}

      {/* Table */}
      {hasActivity ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-amber-950">Product performance</h2>
              <p className="mt-1 text-sm text-stone-600">
                Conversion = paid orders that included the product ÷ PDP views (same window). Requires views tied to{" "}
                <code className="rounded bg-stone-100 px-1 text-xs">productId</code>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-stone-500">Sort:</span>
              {(
                [
                  ["revenue", "Revenue"],
                  ["conversion", "Conversion"],
                  ["engagement", "Engagement"],
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
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-stone-200 text-xs font-semibold uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2 text-right">Views</th>
                  <th className="px-3 py-2 text-right">Add to cart</th>
                  <th className="px-3 py-2 text-right">Paid orders</th>
                  <th className="px-3 py-2 text-right">Conv.</th>
                  <th className="px-3 py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((p) => (
                  <tr key={p.productId} className="border-b border-stone-100 last:border-0">
                    <td className="px-3 py-3">
                      <Link href={`/wear/${p.slug}`} className="font-medium text-amber-900 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{p.views}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{p.addToCart}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{p.paidOrderCount}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">
                      {p.conversionViewToOrderPct != null ? `${p.conversionViewToOrderPct}%` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{eur(p.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <footer className="rounded-xl border border-stone-200/80 bg-stone-50/80 px-4 py-3 text-xs text-stone-500">
        <strong className="text-stone-700">Next:</strong> cohort views, returning buyers, UTM / campaign fields on events —
        structure reserved; not shown yet.
      </footer>
    </div>
  );
}
