import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { metaDashboardPage } from "@/lib/seo-routes";

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

  const plans = [
    {
      slug: "start",
      name: "START",
      price: "€19/month",
      items: ["bookings enabled", "product sales enabled", "basic calendar"],
    },
    {
      slug: "growth",
      name: "GROWTH",
      price: "€49/month",
      items: ["rescheduling", "waitlist", "reminders", "basic analytics"],
    },
    {
      slug: "pro",
      name: "PRO",
      price: "€99/month",
      items: ["CRM", "repeat customer tools", "advanced analytics", "reporting"],
    },
    {
      slug: "scale",
      name: "SCALE",
      price: "€199/month",
      items: ["team management", "multiple instructors", "advanced scheduling", "API access"],
    },
  ];

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
        <h2 className="text-lg font-semibold text-stone-900">Operational plans (locked model)</h2>
        <p className="text-sm text-stone-600">
          These plans are for operational tooling only. Marketplace visibility is never sold.
        </p>
        <ul className="divide-y divide-stone-100 text-sm">
          {plans.map((p) => (
            <li key={p.slug} className="py-3">
              <span className="font-medium text-stone-800">{p.name}</span>{" "}
              <span className="text-stone-500">· {p.price}</span>
              <p className="mt-1 text-stone-600">{p.items.join(" · ")}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-stone-500">
          Checkout for plan subscriptions should be tied to Stripe-connected studios.
        </p>
      </div>
    </div>
  );
}
