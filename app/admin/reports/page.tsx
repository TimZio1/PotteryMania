import { redirect } from "next/navigation";
import { computeCohortRetention } from "@/lib/admin-cohort-retention";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable } from "@/components/admin/data-table";

export const dynamic = "force-dynamic";

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
    { step: "Leads (early access, all time)", value: String(earlyAccessTotal), note: `${earlyAccess30} last 30d` },
    { step: "New registered users (30d)", value: String(users30), note: "Accounts created" },
    { step: "Studios approved", value: String(approvedStudios), note: "KYC / review passed" },
    { step: "Studios activated (paid)", value: String(activatedStudios), note: "€5 activation fee" },
    { step: "Studios with live listing", value: String(vendorsWithListing), note: "Active product or class" },
  ];

  const activationRate = approvedStudios > 0 ? activatedStudios / approvedStudios : 0;

  const cohortRows = await computeCohortRetention({ cohortsBack: 6, horizon: 4 });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Reports</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Growth funnel (supply)</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Operational funnel from early-access lead to live marketplace supply. Cohort view measures share of each signup
        month that placed an order or booking in subsequent calendar months.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Activation rate" value={`${(activationRate * 100).toFixed(1)}%`} hint="Approved → activated" />
        <StatCard label="Early access (30d)" value={String(earlyAccess30)} hint="Top-of-funnel leads" />
        <StatCard label="Live listings" value={String(vendorsWithListing)} hint="Sellable supply" />
        <StatCard label="Approved studios" value={String(approvedStudios)} hint="Pass review" />
      </div>

      <section className="mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-amber-950">Cohort commerce retention</h2>
            <p className="mt-1 text-xs text-stone-500">
              M0–M3 = calendar month offset from cohort month · % with order or booking (linked customer account).
            </p>
          </div>
          <a
            href="/api/admin/reports/cohort?format=csv"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
          >
            Download CSV
          </a>
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
        <h2 className="text-lg font-semibold text-amber-950">Funnel table</h2>
        <div className="mt-4">
          <DataTable
            rows={funnelRows}
            empty="No data."
            columns={[
              { key: "step", header: "Step", cell: (r) => r.step },
              { key: "value", header: "Count", cell: (r) => <span className="font-semibold text-amber-950">{r.value}</span> },
              { key: "note", header: "Note", cell: (r) => <span className="text-xs text-stone-500">{r.note}</span> },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
