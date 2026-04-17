import { redirect } from "next/navigation";
import { computeCohortRetention } from "@/lib/admin-cohort-retention";
import { computeStudioApprovalAddonCohorts } from "@/lib/admin-studio-addon-cohort";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable } from "@/components/admin/data-table";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Reports",
  "/admin/reports",
  "Operational and business reports.",
);

export const dynamic = "force-dynamic";

function metricNum(m: Record<string, unknown>, key: string): number {
  const v = m[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function deltaLabel(cur: number, prev: number): string {
  if (prev === 0 && cur === 0) return "—";
  if (prev === 0) return "n/a";
  const d = ((cur - prev) / prev) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
}

export default async function AdminReportsPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const last30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);

  const [
    earlyAccessTotal,
    earlyAccess30,
    users30,
    approvedStudios,
    activatedStudios,
    vendorsWithListing,
  ] = await Promise.all([
    prisma.earlyAccessSignup.count(),
    prisma.earlyAccessSignup.count({ where: { createdAt: { gte: last30 } } }),
    prisma.user.count({ where: { createdAt: { gte: last30 } } }),
    prisma.studio.count({ where: { status: "approved" } }),
    prisma.studio.count({ where: { activationPaidAt: { not: null } } }),
    prisma.studio.count({
      where: {
        status: "approved",
        OR: [{ products: { some: { status: "active" } } }, { experiences: { some: { status: "active" } } }],
      },
    }),
  ]);

  const funnelRows = [
    { step: "Leads (legacy capture form, all time)", value: String(earlyAccessTotal), note: `${earlyAccess30} last 30d` },
    { step: "New registered users (30d)", value: String(users30), note: "Accounts created" },
    { step: "Studios cleared", value: String(approvedStudios), note: "Self-serve studio onboarding" },
    { step: "Studios activated", value: String(activatedStudios), note: "Stripe Connect enabled" },
    { step: "Studios with live offers", value: String(vendorsWithListing), note: "Active product or class" },
  ];

  const activationRate = approvedStudios > 0 ? activatedStudios / approvedStudios : 0;

  const cohortRows = await computeCohortRetention({ cohortsBack: 6, horizon: 4 });
  const studioAddonCohortRows = await computeStudioApprovalAddonCohorts(12);

  const dailySnapshots = await prisma.analyticsSnapshot.findMany({
    where: { snapshotScope: "platform", studioId: null },
    orderBy: { snapshotDate: "desc" },
    take: 14,
    select: { snapshotDate: true, metrics: true },
  });

  const latestSnap = dailySnapshots[0];
  const priorSnap = dailySnapshots[1];
  let dodRows: Array<{ metric: string; latest: string; prior: string; delta: string }> = [];
  if (latestSnap && priorSnap) {
    const cm = latestSnap.metrics as Record<string, unknown>;
    const pm = priorSnap.metrics as Record<string, unknown>;
    const pairs: Array<{ metric: string; curKey: string }> = [
      { metric: "Orders (count)", curKey: "ordersCount" },
      { metric: "Paid order GMV (cents)", curKey: "ordersPaidTotalCents" },
      { metric: "Bookings (count)", curKey: "bookingsCount" },
      { metric: "Booking deposits (cents)", curKey: "bookingsDepositTotalCents" },
      { metric: "New users", curKey: "newUsers" },
      { metric: "Studios cleared", curKey: "newStudiosApproved" },
      { metric: "Insight purchases (cents)", curKey: "insightPurchaseTotalCents" },
    ];
    dodRows = pairs.map(({ metric, curKey }) => {
      const cur = metricNum(cm, curKey);
      const prev = metricNum(pm, curKey);
      return {
        metric,
        latest: String(cur),
        prior: String(prev),
        delta: deltaLabel(cur, prev),
      };
    });
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Reports</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Growth funnel (supply)</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Operational funnel from legacy studio lead capture to live studio supply. Cohort view measures share of each signup
        month that placed an order or booking in subsequent calendar months.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Activation rate" value={`${(activationRate * 100).toFixed(1)}%`} hint="Cleared → activated" />
        <StatCard label="Studio leads (30d)" value={String(earlyAccess30)} hint="Legacy capture form" />
        <StatCard label="Live listings" value={String(vendorsWithListing)} hint="Sellable supply" />
        <StatCard label="Studios cleared" value={String(approvedStudios)} hint="Ready to go live" />
      </div>

      {dodRows.length > 0 && latestSnap && priorSnap ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Daily performance vs prior UTC day</h2>
          <p className="mt-1 max-w-2xl text-xs text-[var(--muted)]">
            Comparing{" "}
            <span className="font-mono">{latestSnap.snapshotDate.toISOString().slice(0, 10)}</span> to{" "}
            <span className="font-mono">{priorSnap.snapshotDate.toISOString().slice(0, 10)}</span> from stored snapshots
            (not live recomputation).
          </p>
          <div className="mt-4">
            <DataTable
              rows={dodRows}
              columns={[
                { key: "m", header: "Metric", cell: (r) => r.metric },
                { key: "l", header: "Latest day", cell: (r) => <span className="font-mono text-xs">{r.latest}</span> },
                { key: "p", header: "Prior day", cell: (r) => <span className="font-mono text-xs">{r.prior}</span> },
                { key: "d", header: "Δ %", cell: (r) => <span className="tabular-nums text-[var(--foreground)]">{r.delta}</span> },
              ]}
              empty="—"
            />
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Daily platform snapshots</h2>
        <p className="mt-1 max-w-2xl text-xs text-[var(--muted)]">
          UTC-day aggregates from <code className="text-[11px]">analytics_snapshots</code>. Populate via cron{" "}
          <code className="text-[11px]">GET /api/cron/analytics-snapshots</code> (Bearer <code className="text-[11px]">CRON_SECRET</code>
          ).
        </p>
        <div className="mt-4">
          <DataTable
            rows={dailySnapshots.map((s) => {
              const m = s.metrics as Record<string, unknown>;
              return {
                day: s.snapshotDate.toISOString().slice(0, 10),
                orders: String(m.ordersCount ?? "—"),
                bookings: String(m.bookingsCount ?? "—"),
                users: String(m.newUsers ?? "—"),
                insights: String(m.insightPurchaseTotalCents ?? "—"),
              };
            })}
            empty="No snapshots yet — run the analytics-snapshots cron."
            columns={[
              { key: "d", header: "UTC day", cell: (r) => <span className="font-mono text-xs">{r.day}</span> },
              { key: "o", header: "Orders", cell: (r) => r.orders },
              { key: "b", header: "Bookings", cell: (r) => r.bookings },
              { key: "u", header: "New users", cell: (r) => r.users },
              { key: "i", header: "Insight € (cents)", cell: (r) => r.insights },
            ]}
          />
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Cohort commerce retention</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              M0–M3 = calendar month offset from cohort month · % with order or booking (linked customer account).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/admin/reports/cohort?format=csv"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
            >
              Cohort CSV
            </a>
            <a
              href="/api/admin/reports/feature-adoption?format=csv"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
            >
              Feature adoption CSV
            </a>
            <a
              href="/api/admin/reports/feature-retention?format=csv"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
            >
              Studio add-on cohort CSV
            </a>
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            rows={cohortRows}
            empty="No cohorts."
            columns={[
              { key: "cohort", header: "Cohort", cell: (r) => <span className="font-mono text-xs">{r.cohortMonth}</span> },
              { key: "n", header: "Signups", cell: (r) => String(r.signupCount) },
              { key: "m0", header: "M0 %", cell: (r) => `${(r.retention[0] * 100).toFixed(1)}%` },
              { key: "m1", header: "M1 %", cell: (r) => `${(r.retention[1] * 100).toFixed(1)}%` },
              { key: "m2", header: "M2 %", cell: (r) => `${(r.retention[2] * 100).toFixed(1)}%` },
              { key: "m3", header: "M3 %", cell: (r) => `${(r.retention[3] * 100).toFixed(1)}%` },
            ]}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Studio review cohort — paid add-on penetration (now)</h2>
        <p className="mt-1 max-w-3xl text-xs text-[var(--muted)]">
          Cohort month = UTC month of <code className="text-[11px]">approvedAt</code>. “Paid add-on” = any non–grant-by-default
          catalog feature with billable activation today (<code className="text-[11px]">active</code>,{" "}
          <code className="text-[11px]">trialing</code>, <code className="text-[11px]">pending_cancel</code>). This is a{" "}
          <strong>current snapshot</strong>, not historical month-end reconstruction.
        </p>
        <div className="mt-4">
          <DataTable
            rows={studioAddonCohortRows}
            empty="No cohorts in window."
            columns={[
              { key: "c", header: "Cohort", cell: (r) => <span className="font-mono text-xs">{r.cohortMonth}</span> },
              { key: "a", header: "Studios in cohort", cell: (r) => String(r.approvedStudios) },
              { key: "p", header: "With paid add-on now", cell: (r) => String(r.withPaidAddonNow) },
              { key: "pct", header: "Penetration", cell: (r) => `${r.penetrationPct.toFixed(1)}%` },
            ]}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Funnel table</h2>
        <div className="mt-4">
          <DataTable
            rows={funnelRows}
            empty="No data."
            columns={[
              { key: "step", header: "Step", cell: (r) => r.step },
              { key: "value", header: "Count", cell: (r) => <span className="font-semibold text-[var(--foreground)]">{r.value}</span> },
              { key: "note", header: "Note", cell: (r) => <span className="text-xs text-[var(--muted)]">{r.note}</span> },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
