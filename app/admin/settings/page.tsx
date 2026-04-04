import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { CommissionForm } from "./commission-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const configSample = await prisma.adminConfig.findMany({
    orderBy: { configKey: "asc" },
    take: 40,
    select: { configKey: true },
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Settings</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Platform configuration</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Commission edits are versioned in the audit log. Deeper billing lives in the finance engine.
      </p>

      <div className="mt-8">
        <CommissionForm />
      </div>

      <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-950">Admin config keys (read-only)</h2>
        <p className="mt-2 text-xs text-stone-500">
          {configSample.length} keys shown. Use DB or future editor for values; changes should go through audit.
        </p>
        <ul className="mt-4 max-h-48 overflow-auto font-mono text-xs text-stone-600">
          {configSample.map((c) => (
            <li key={c.configKey}>{c.configKey}</li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-sm">
        <Link href="/admin/finance" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Open finance command center →
        </Link>
      </p>
    </div>
  );
}
