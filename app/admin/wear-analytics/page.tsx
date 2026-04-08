import { redirect } from "next/navigation";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { loadWearDashboard, parseWearAnalyticsRange } from "@/lib/wear-analytics-dashboard";
import WearAnalyticsDashboardClient from "@/components/admin/wear-analytics-dashboard-client";

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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Commerce · Wear</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Wear analytics</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Decision-focused view of the native wear funnel. Revenue and orders come from paid Stripe checkouts; funnel steps
        from on-site events. Use it to see where to act next — not to admire charts.
      </p>
      <WearAnalyticsDashboardClient {...clientProps} />
    </div>
  );
}
