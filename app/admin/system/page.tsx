import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { StatCard } from "@/components/admin/stat-card";
import { SystemHealthPings } from "@/components/admin/system-health-pings";
import { FeatureFlagsPanel } from "./feature-flags-panel";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "System",
  "/admin/system",
  "System status and diagnostics.",
);

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const [flags, adminConfigsCount, snapshots] = await Promise.all([
    prisma.featureFlag.findMany({ orderBy: { flagKey: "asc" } }),
    prisma.adminConfig.count(),
    prisma.analyticsSnapshot.count(),
  ]);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">System</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Health & controls</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Feature flags are audited. Environment signals are read-only here; set secrets on your host (Railway / Vercel).
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Feature flags (all)" value={String(flags.length)} hint={`${flags.filter((f) => f.isActive).length} active`} />
        <StatCard label="Admin config rows" value={String(adminConfigsCount)} hint="Key/value tuning" />
        <StatCard label="Analytics snapshots" value={String(snapshots)} hint="Historical metrics store" />
        <StatCard
          label="Sentry"
          value={process.env.SENTRY_DSN ? "Configured" : "Off"}
          hint={process.env.SENTRY_DSN ? "Error capture active" : "Configure error monitoring in deployment"}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Feature flags</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Toggle <code className="text-xs">booking_checkout_enabled</code> and{" "}
          <code className="text-xs">marketplace_checkout_enabled</code> (product / shop checkout; legacy env key name) to
          pause new checkouts without redeploying (60s cache on API nodes).
        </p>
        <div className="mt-4">
          <FeatureFlagsPanel
            initial={flags.map((f) => ({
              id: f.id,
              flagKey: f.flagKey,
              flagValue: f.flagValue,
              isActive: f.isActive,
            }))}
          />
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-[var(--foreground)]">Endpoint checks</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Browser-side fetch to this origin (session cookie applies to Auth). For production signals, also use host monitoring.
        </p>
        <SystemHealthPings />
      </section>

      <section className="mt-10 rounded-2xl border border-stone-200 bg-stone-50/80 p-5 text-sm text-stone-600">
        <h2 className="font-semibold text-[var(--foreground)]">Environment snapshot</h2>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>
            Guest restricted mode:{" "}
            <code className="text-xs">{process.env.PREREGISTRATION_ONLY === "1" ? "on" : "off"}</code>
          </li>
          <li>
            Public site URL:{" "}
            <code className="text-xs">{process.env.NEXT_PUBLIC_SITE_URL ?? "—"}</code>
          </li>
          <li>
            Database:{" "}
            <code className="text-xs">{process.env.DATABASE_URL ? "connected" : "not configured"}</code>
          </li>
        </ul>
      </section>
    </div>
  );
}
