import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth-session";
import ExperimentsAdminClient from "@/components/admin/experiments-admin-client";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Experiments",
  "/admin/experiments",
  "A/B experiments and rollout controls.",
);

export const dynamic = "force-dynamic";

export default async function AdminExperimentsPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Experiments</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">A/B definitions</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Assignments are deterministic per subject via <code className="text-xs">experimentVariantForSubject</code> in app
        code (no per-request DB row). Use for copy or layout tests.
      </p>
      <div className="mt-8">
        <ExperimentsAdminClient />
      </div>
    </div>
  );
}
