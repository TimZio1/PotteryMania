"use client";

import { useEffect, useState } from "react";
import { ui } from "@/lib/ui-styles";
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
};

export default function StudioAnalyticsPanel({ studioId }: { studioId: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/studios/${studioId}/analytics`);
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || "Could not load analytics");
        return;
      }
      setMetrics(json.metrics);
    })();
  }, [studioId]);

  if (err) return <p className={ui.errorText}>{err}</p>;
  if (!metrics) return <p className="text-sm text-stone-500">Loading analytics…</p>;

  return (
    <>
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

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
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
