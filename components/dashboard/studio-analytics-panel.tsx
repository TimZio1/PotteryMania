"use client";

import { useCallback, useEffect, useState } from "react";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";
import { formatMoneyEur } from "@/lib/i18n";

type Metrics = {
  orderRevenueCents: number;
  bookingRevenueCents: number;
  totalOrders: number;
  totalBookings: number;
  totalProducts: number;
  totalExperiences: number;
  topProducts: { id: string; title: string; orders: number }[];
  topExperiences: { id: string; title: string; bookings: number }[];
  rangeDays?: number;
  attendanceRate?: number | null;
  attendanceCompleted?: number;
  attendanceDenominator?: number;
  bookingsPerWeek?: { label: string; count: number }[];
  revenueByWeek?: { label: string; revenueCents: number }[];
};

const DAY_OPTIONS = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];

export default function StudioAnalyticsPanel({ studioId }: { studioId: string }) {
  const [days, setDays] = useState(30);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studioId}/analytics?days=${days}`);
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || "Could not load analytics");
      return;
    }
    setErr("");
    setMetrics(json.metrics);
  }, [studioId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxBook = metrics?.bookingsPerWeek?.length
    ? Math.max(1, ...metrics.bookingsPerWeek.map((b) => b.count))
    : 1;
  const maxRev = metrics?.revenueByWeek?.length
    ? Math.max(1, ...metrics.revenueByWeek.map((b) => b.revenueCents))
    : 1;

  if (err) return <p className={ui.errorText}>{err}</p>;
  if (!metrics) return <p className="text-sm text-stone-500">Loading analytics…</p>;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">Rolling window for charts and attendance</p>
        <div className="flex gap-1">
          {DAY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium",
                days === o.value ? "bg-amber-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200",
              )}
              onClick={() => setDays(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Product revenue", formatMoneyEur(metrics.orderRevenueCents)],
          ["Booking revenue", formatMoneyEur(metrics.bookingRevenueCents)],
          ["Orders", String(metrics.totalOrders)],
          ["Bookings", String(metrics.totalBookings)],
        ].map(([label, value]) => (
          <div key={label} className={ui.card}>
            <p className="text-sm text-stone-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-amber-950">{value}</p>
          </div>
        ))}
      </div>

      {metrics.attendanceRate != null && metrics.rangeDays ? (
        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-stone-900">Attendance rate</h2>
          <p className="mt-1 text-sm text-stone-600">
            Completed ÷ (confirmed-style statuses) for bookings created in the last {metrics.rangeDays} days.
          </p>
          <p className="mt-3 text-3xl font-semibold text-amber-950">{metrics.attendanceRate}%</p>
          <p className="mt-1 text-xs text-stone-500">
            {metrics.attendanceCompleted ?? 0} completed of {metrics.attendanceDenominator ?? 0} counted
          </p>
        </div>
      ) : null}

      {metrics.bookingsPerWeek && metrics.bookingsPerWeek.length > 0 ? (
        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-stone-900">Bookings per week (~7d buckets)</h2>
          <div className="mt-4 flex h-40 items-end gap-2">
            {metrics.bookingsPerWeek.map((b) => (
              <div key={b.label} className="flex min-h-0 flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full max-w-[48px] rounded-t bg-amber-700/90 transition-all"
                  style={{ height: `${Math.max(6, Math.round((b.count / maxBook) * 120))}px` }}
                  title={`${b.count} bookings`}
                />
                <span className="max-w-full truncate text-[10px] text-stone-500">{b.label.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {metrics.revenueByWeek && metrics.revenueByWeek.length > 0 ? (
        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-stone-900">Revenue trend (paid order totals + booking deposits)</h2>
          <div className="mt-4 flex h-40 items-end gap-2">
            {metrics.revenueByWeek.map((b) => (
              <div key={b.label} className="flex min-h-0 flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full max-w-[48px] rounded-t bg-stone-600/90 transition-all"
                  style={{ height: `${Math.max(6, Math.round((b.revenueCents / maxRev) * 120))}px` }}
                  title={formatMoneyEur(b.revenueCents)}
                />
                <span className="max-w-full truncate text-[10px] text-stone-500">{b.label.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-stone-900">Top products</h2>
          <ul className="mt-4 space-y-2 text-sm text-stone-600">
            {metrics.topProducts.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.title}</span>
                <span>{item.orders} sold</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-stone-900">Top classes</h2>
          <ul className="mt-4 space-y-2 text-sm text-stone-600">
            {metrics.topExperiences.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.title}</span>
                <span>{item.bookings} bookings</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
