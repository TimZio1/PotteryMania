import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { StatCard } from "@/components/admin/stat-card";
import { FeatureFlagsPanel } from "./feature-flags-panel";

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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">System</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Health & controls</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Feature flags are audited. Environment signals are read-only here; set secrets on your host (Railway / Vercel).
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Feature flags (all)" value={String(flags.length)} hint={`${flags.filter((f) => f.isActive).length} active`} />
        <StatCard label="Admin config rows" value={String(adminConfigsCount)} hint="Key/value tuning" />
        <StatCard label="Analytics snapshots" value={String(snapshots)} hint="Historical metrics store" />
        <StatCard
          label="Sentry"
          value={process.env.SENTRY_DSN ? "Configured" : "Off"}
          hint={process.env.SENTRY_DSN ? "Error capture" : "Set SENTRY_DSN for ops visibility"}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-amber-950">Feature flags</h2>
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

      <section className="mt-10 rounded-2xl border border-stone-200 bg-stone-50/80 p-5 text-sm text-stone-600">
        <h2 className="font-semibold text-amber-950">Environment snapshot</h2>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>
            Preregistration-only:{" "}
            <code className="text-xs">{process.env.PREREGISTRATION_ONLY === "1" ? "on" : "off"}</code>
          </li>
          <li>
            Public site URL:{" "}
            <code className="text-xs">{process.env.NEXT_PUBLIC_SITE_URL ?? "—"}</code>
          </li>
          <li>
            Database:{" "}
            <code className="text-xs">{process.env.DATABASE_URL ? "connected (URL set)" : "missing"}</code>
          </li>
        </ul>
      </section>
    </div>
  );
}
