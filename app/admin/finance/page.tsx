import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth-session";
import { FinanceCommandCenter } from "./finance-command-center";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  const user = await requireAdminUser();
  if (!user) {
    redirect("/unauthorized-admin");
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Profit intelligence</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Financial command center</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
        Ledger-backed revenue, costs, stream profitability, alerts, and recommendations. Data fills after migration deploy and{" "}
        <code className="rounded bg-stone-200/60 px-1">/api/cron/finance-reconcile</code>.
      </p>
      <div className="mt-8">
        <FinanceCommandCenter />
      </div>
    </div>
  );
}
