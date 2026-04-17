import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth-session";
import { FinanceCommandCenter } from "./finance-command-center";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Finance engine",
  "/admin/finance",
  "Ledger, exports, and financial intelligence.",
);

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  const user = await requireAdminUser();
  if (!user) {
    redirect("/unauthorized-admin");
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Profit intelligence</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Financial command center</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        Ledger-backed revenue, costs, stream profitability, alerts, and recommendations. Data fills after migration deploy and{" "}
        <code className="rounded bg-stone-200/60 px-1">/api/cron/finance-reconcile</code>.
      </p>
      <div className="mt-8">
        <FinanceCommandCenter />
      </div>
    </div>
  );
}
