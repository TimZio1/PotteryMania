import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { ui } from "@/lib/ui-styles";
import { metaDashboardPage } from "@/lib/seo-routes";
import { annualEquivalentLabel, buildStudioPlans, monthlyLabel } from "@/lib/studio-plan-pricing";
import { getMarketingCheckoutCommissionPctLabel } from "@/lib/commission";
import {
  getStudioPlanCommissionLabelMap,
  resolveStudioPlanPricingConfig,
} from "@/lib/studio-plan-pricing-config";

export const metadata: Metadata = metaDashboardPage(
  "Billing",
  "/dashboard/billing",
  "Your studio plans, add-ons, and subscription.",
);

export const dynamic = "force-dynamic";

/**
 * Tier 5D surface: platform billing plans (read-only) + pointer to per-studio add-on checkout.
 */
export default async function DashboardBillingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/billing");
  const commissionLabel = await getMarketingCheckoutCommissionPctLabel();
  const [pricingConfig, commissionLabelByPlan] = await Promise.all([
    resolveStudioPlanPricingConfig(),
    getStudioPlanCommissionLabelMap(),
  ]);
  const STUDIO_PLANS = buildStudioPlans(commissionLabelByPlan, pricingConfig);
  const studios =
    user.role === "vendor"
      ? await prisma.studio.findMany({
          where: { ownerUserId: user.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, displayName: true },
        })
      : [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div>
        <p className={ui.overline}>Billing</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Billing</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Your plans, add-ons, and subscription — all here.
        </p>
      </div>

      {studios.length > 0 ? (
        <div className={`${ui.card} space-y-4`}>
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Buy add-ons or upgrade</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Purchases happen per studio. Open the studio you want to upgrade.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {studios.map((studio) => (
              <div
                key={studio.id}
                className="flex flex-col gap-3 rounded-xl border border-stone-200/80 bg-stone-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-stone-900">{studio.displayName}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Buy add-ons, start a subscription, or unlock features.</p>
                </div>
                <Link href={`/dashboard/${studio.id}/features`} className={ui.buttonPrimary}>
                  Open add-ons
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`${ui.card} space-y-3`}>
        <h2 className="text-lg font-semibold text-stone-900">Studio plans</h2>
        <p className="text-sm text-[var(--muted)]">
          Pick the plan that matches how you use your studio — classes only, shop only, both, or pro. Platform fee on
          sales is {commissionLabel} across tiers.
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Start free. Upgrade when you&apos;re ready. Compare plans on the{" "}
          <Link href="/pricing" className="font-semibold text-amber-900 underline underline-offset-2">
            pricing page
          </Link>
          .
        </p>
        <ul className="mt-4 divide-y divide-stone-100 text-sm">
          {STUDIO_PLANS.map((plan) => (
            <li key={plan.key} className="py-3">
              <span className="font-medium text-[var(--foreground)]">
                {plan.name}
                {plan.recommended ? (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                    Most popular
                  </span>
                ) : null}
              </span>{" "}
              <span className="text-[var(--muted)]">
                · {monthlyLabel(plan)} · {annualEquivalentLabel(plan)}
              </span>
              <p className="mt-1 text-[var(--muted)]">{plan.headline}</p>
              <p className="mt-1 text-[var(--muted)]">{plan.includes.join(" · ")}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 text-xs">
          <table className="w-full min-w-[520px] text-left">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-3 py-2 font-semibold text-[var(--foreground)]">Plan</th>
                <th className="px-3 py-2 font-semibold text-[var(--foreground)]">Best for</th>
                <th className="px-3 py-2 font-semibold text-[var(--foreground)]">Monthly</th>
              </tr>
            </thead>
            <tbody>
              {STUDIO_PLANS.map((plan) => (
                <tr key={plan.key} className="border-t border-stone-100">
                  <td className="px-3 py-2 font-medium text-[var(--foreground)]">{plan.name}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{plan.headline}</td>
                  <td className="px-3 py-2 text-[var(--foreground)]">{monthlyLabel(plan)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Add-ons are purchased per studio from the Add-ons page.
        </p>
      </div>
      <div className={`${ui.card} space-y-3`}>
        <h2 className="text-lg font-semibold text-stone-900">Popular add-ons</h2>
        <p className="text-sm text-[var(--muted)]">
          Keep your plan simple. Add what you need, when you need it.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]">
          <li>Reminders and automation</li>
          <li>Advanced analytics</li>
          <li>Priority support</li>
          <li>Premium branding and templates</li>
        </ul>
        {studios[0] ? (
          <Link href={`/dashboard/${studios[0].id}/features`} className={ui.buttonSecondary}>
            Open add-ons
          </Link>
        ) : null}
      </div>
    </div>
  );
}
