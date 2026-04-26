import { redirect } from "next/navigation";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { loadWearDashboard, parseWearAnalyticsRange } from "@/lib/wear-analytics-dashboard";
import WearAnalyticsDashboardClient from "@/components/admin/wear-analytics-dashboard-client";
import { loadWearCatalogValueSnapshot } from "@/lib/wear-spreadconnect-stats";
import { formatWearMoney } from "@/lib/wear-money";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Wear analytics",
  "/admin/wear-analytics",
  "Wear shop performance and conversion metrics.",
);

export const dynamic = "force-dynamic";

export default async function AdminWearAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const user = await requireHyperAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const sp = await searchParams;
  const range = parseWearAnalyticsRange({
    range: sp.range,
    from: sp.from,
    to: sp.to,
  });

  const dashboard = await loadWearDashboard(range);

  let catalogValue: Awaited<ReturnType<typeof loadWearCatalogValueSnapshot>> | null = null;
  try {
    catalogValue = await loadWearCatalogValueSnapshot();
  } catch (err) {
    console.error("[admin/wear-analytics] catalog value snapshot failed", err);
  }

  const clientProps = {
    ...dashboard,
    range: {
      label: dashboard.range.label,
      preset: dashboard.range.preset,
      startISO: dashboard.range.start.toISOString(),
      endISO: dashboard.range.end.toISOString(),
    },
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Commerce · Wear</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Wear analytics</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Decision-focused view of the native wear funnel. Revenue and orders come from paid Stripe checkouts; funnel steps
        from on-site events. Use it to see where to act next — not to admire charts.
      </p>

      {catalogValue ? (
        <section
          aria-label="Spreadconnect catalog value"
          className="mt-6 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-stone-50 p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
              Spreadconnect catalog value (live)
            </p>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                catalogValue.usingInternalPricing
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  catalogValue.usingInternalPricing ? "bg-emerald-500" : "bg-stone-400"
                }`}
              />
              {catalogValue.usingInternalPricing ? "Internal pricing" : "DB list prices"}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-amber-200 bg-white px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Catalog value</dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight text-amber-950">
                {formatWearMoney(catalogValue.totalCatalogValueCents, catalogValue.currency)}
              </dd>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Catalog cost</dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight text-stone-800">
                {formatWearMoney(catalogValue.totalCatalogCostCents, catalogValue.currency)}
              </dd>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Estimated margin
              </dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight text-emerald-800">
                {formatWearMoney(catalogValue.totalCatalogMarginCents, catalogValue.currency)}
              </dd>
            </div>
            <div className="rounded-xl border border-sky-200 bg-white px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                SC-linked / total
              </dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight text-sky-900">
                {catalogValue.spreadconnectLinkedProducts}
                <span className="ml-1 text-base font-medium text-stone-500">
                  / {catalogValue.totalProducts}
                </span>
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      <WearAnalyticsDashboardClient {...clientProps} />
    </div>
  );
}
