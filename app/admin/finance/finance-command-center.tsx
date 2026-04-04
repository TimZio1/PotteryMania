"use client";

import { useEffect, useState } from "react";

function eur(cents: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

type Overview = {
  today: { revenueCents: number; costCents: number; profitCents: number; marginBps: number | null };
  month: { revenueCents: number; costCents: number; profitCents: number; marginBps: number | null };
  streams: Array<{ stream: string; revenueCents: number; costAllocatedCents: number; profitCents: number }>;
  arpuMonthCents: number;
  payingUsersCount: number;
};

export function FinanceCommandCenter() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [alerts, setAlerts] = useState<{ title: string; severity: string; summary: string }[]>([]);
  const [recs, setRecs] = useState<{ title: string; problem: string }[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [o, a, r] = await Promise.all([
          fetch("/api/admin/finance/overview").then((x) => x.json()),
          fetch("/api/admin/finance/alerts").then((x) => x.json()),
          fetch("/api/admin/finance/recommendations").then((x) => x.json()),
        ]);
        if (o.error) {
          setErr(o.error);
          return;
        }
        setOverview(o);
        setAlerts((a.alerts ?? []).slice(0, 5));
        setRecs((r.recommendations ?? []).slice(0, 5));
      } catch {
        setErr("Failed to load finance data");
      }
    })();
  }, []);

  if (err) {
    return <p className="text-sm text-red-600">{err}</p>;
  }

  if (!overview) {
    return <p className="text-sm text-stone-500">Loading financial intelligence…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Platform revenue (today)" value={eur(overview.today.revenueCents)} sub="Commission + activation" />
        <MetricCard label="Costs (today)" value={eur(overview.today.costCents)} sub="Fees, refunds, allocated" />
        <MetricCard label="Profit (today)" value={eur(overview.today.profitCents)} sub={marginLabel(overview.today.marginBps)} />
        <MetricCard label="Month profit" value={eur(overview.month.profitCents)} sub={marginLabel(overview.month.marginBps)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="ARPU (month proxy)" value={eur(overview.arpuMonthCents)} sub={`${overview.payingUsersCount} paying users in window`} />
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-amber-950">Exports</p>
          <p className="mt-2 text-sm text-stone-600">CSV downloads (auth required in browser).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="/api/admin/finance/exports?type=ledger&days=90"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-amber-950 hover:bg-stone-50"
            >
              Ledger 90d
            </a>
            <a
              href="/api/admin/finance/exports?type=snapshots&days=90"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-amber-950 hover:bg-stone-50"
            >
              Snapshots 90d
            </a>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-amber-950">Revenue streams (month)</h2>
        <ul className="mt-4 divide-y divide-stone-100 text-sm">
          {overview.streams.map((s) => (
            <li key={s.stream} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="font-medium capitalize text-stone-800">{s.stream.replace(/_/g, " ")}</span>
              <span className="text-stone-600">
                {eur(s.revenueCents)} rev · {eur(s.costAllocatedCents)} cost ·{" "}
                <span className={s.profitCents >= 0 ? "text-emerald-800" : "text-red-700"}>{eur(s.profitCents)} profit</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6">
          <h2 className="text-lg font-semibold text-amber-950">Alerts</h2>
          {alerts.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">No open alerts. Run the finance reconcile cron to generate signals.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {alerts.map((a) => (
                <li key={a.title} className="rounded-xl border border-amber-200/80 bg-white p-3">
                  <p className="font-medium text-amber-950">
                    [{a.severity}] {a.title}
                  </p>
                  <p className="mt-1 text-stone-600">{a.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6">
          <h2 className="text-lg font-semibold text-emerald-950">Recommendations</h2>
          {recs.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">No suggestions yet — needs more ledger history or usage facts.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {recs.map((r) => (
                <li key={r.title} className="rounded-xl border border-emerald-200/80 bg-white p-3">
                  <p className="font-medium text-emerald-950">{r.title}</p>
                  <p className="mt-1 text-stone-600">{r.problem}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-stone-200 bg-stone-50/80 p-6 text-sm text-stone-600">
        <p className="font-semibold text-amber-950">Cron</p>
        <p className="mt-2">
          Schedule <code className="rounded bg-stone-200/80 px-1">GET /api/cron/finance-reconcile</code> with{" "}
          <code className="rounded bg-stone-200/80 px-1">Authorization: Bearer CRON_SECRET</code> to backfill ledger, sync Stripe
          fees, roll daily snapshots, and refresh alerts.
        </p>
      </section>
    </div>
  );
}

function marginLabel(bps: number | null) {
  if (bps === null) return "Margin n/a";
  return `Margin ${(bps / 100).toFixed(1)}%`;
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-amber-950">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{sub}</p>
    </div>
  );
}
