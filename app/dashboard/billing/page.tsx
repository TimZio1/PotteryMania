import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { metaDashboardPage } from "@/lib/seo-routes";
import Link from "next/link";
import { annualEquivalentLabel, monthlyLabel, STUDIO_PLANS } from "@/lib/studio-plan-pricing";

export const metadata: Metadata = metaDashboardPage(
  "Billing",
  "/dashboard/billing",
  "Platform subscription, invoices, and pointers to studio add-on billing.",
);

export const dynamic = "force-dynamic";

/**
 * Tier 5D surface: platform billing plans (read-only) + pointer to per-studio add-on checkout.
 */
export default async function DashboardBillingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/billing");

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

      <div className={`${ui.card} space-y-3`}>
        <h2 className="text-lg font-semibold text-stone-900">Studio plans (0% commission model)</h2>
        <p className="text-sm text-stone-600">
          Plans are based on studio usage: bookings-only, shop-only, both, or pro. Platform take-rate stays at 0%.
        </p>
        <p className="mt-3 text-sm font-medium text-amber-950">
          This replaces multiple tools you are currently using — site, bookings, shop, and the glue between them.
        </p>
        <p className="mt-2 text-sm text-stone-600">
          Start free. Upgrade when you&apos;re ready. Public comparison:{" "}
          <Link href="/pricing" className="font-semibold text-amber-900 underline underline-offset-2">
            Pricing page
          </Link>
          .
        </p>
        <ul className="mt-4 divide-y divide-stone-100 text-sm">
          {STUDIO_PLANS.map((plan) => (
            <li key={plan.key} className="py-3">
              <span className="font-medium text-stone-800">
                {plan.name}
                {plan.recommended ? (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                    Most popular
                  </span>
                ) : null}
              </span>{" "}
              <span className="text-stone-500">
                · {monthlyLabel(plan)} · {annualEquivalentLabel(plan)}
              </span>
              <p className="mt-1 text-stone-600">{plan.headline}</p>
              <p className="mt-1 text-stone-500">{plan.includes.join(" · ")}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 text-xs">
          <table className="w-full min-w-[520px] text-left">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-3 py-2 font-semibold text-stone-800">Plan</th>
                <th className="px-3 py-2 font-semibold text-stone-800">Best for</th>
                <th className="px-3 py-2 font-semibold text-stone-800">Monthly</th>
              </tr>
            </thead>
            <tbody>
              {STUDIO_PLANS.map((plan) => (
                <tr key={plan.key} className="border-t border-stone-100">
                  <td className="px-3 py-2 font-medium text-stone-800">{plan.name}</td>
                  <td className="px-3 py-2 text-stone-600">{plan.headline}</td>
                  <td className="px-3 py-2 text-stone-700">{monthlyLabel(plan)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-500">
          Add-ons are still purchased per studio from Features / Add-ons.
        </p>
      </div>
      <div className={`${ui.card} space-y-3`}>
        <h2 className="text-lg font-semibold text-stone-900">High-impact add-ons</h2>
        <p className="text-sm text-stone-600">
          Keep your base plan competitive, then scale with optional paid capabilities.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li>Automation and reminder packs</li>
          <li>Advanced analytics and reporting</li>
          <li>Priority support</li>
          <li>Premium branding and template upgrades</li>
        </ul>
      </div>
    </div>
  );
}
