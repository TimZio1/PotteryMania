import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

/**
 * Tier 5D surface: platform billing plans (read-only) + pointer to per-studio add-on checkout.
 */
export default async function DashboardBillingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/billing");

  const plans = await prisma.billingPlan.findMany({
    where: { isActive: true },
    orderBy: { priceCents: "asc" },
    include: { entitlements: { take: 12 } },
  });

  const studios = await prisma.studio.findMany({
    where: { ownerUserId: user.id, status: "approved" },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div>
        <p className={ui.overline}>Billing</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Plans & subscriptions</h1>
        <p className="mt-2 text-sm text-stone-600">
          PotteryMania add-ons (features, bundles) are purchased per studio from{" "}
          <strong>Features / Add-ons</strong>. Legacy <code className="text-xs">billing_plans</code> rows below are shown for
          transparency when platform-wide vendor plans are enabled.
        </p>
      </div>

      {studios.length > 0 ? (
        <div className={`${ui.card} space-y-2`}>
          <h2 className="text-lg font-semibold text-stone-900">Your studios</h2>
          <ul className="space-y-2 text-sm">
            {studios.map((s) => (
              <li key={s.id}>
                <Link href={`/dashboard/${s.id}/features`} className="font-medium text-amber-900 underline">
                  {s.displayName} — manage add-ons
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-stone-600">No approved studios yet.</p>
      )}

      <div className={`${ui.card} space-y-3`}>
        <h2 className="text-lg font-semibold text-stone-900">Platform billing plans (catalog)</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-stone-500">No active plans in the database.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {plans.map((p) => (
              <li key={p.id} className="py-3">
                <span className="font-medium text-stone-800">{p.name}</span>{" "}
                <span className="text-stone-500">
                  ({p.slug}) · {(p.priceCents / 100).toFixed(2)} {p.currency} / {p.interval}
                </span>
                {p.description ? <p className="mt-1 text-stone-600">{p.description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
