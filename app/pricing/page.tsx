import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";
import { softwareApplicationJsonLd, toJsonLdScript } from "@/lib/structured-data";
import { ui } from "@/lib/ui-styles";
import type { StudioPlan } from "@/lib/studio-plan-pricing";
import { annualEquivalentLabel, buildStudioPlans, monthlyLabel } from "@/lib/studio-plan-pricing";
import { getMarketingCheckoutCommissionPctLabel } from "@/lib/commission";
import {
  getStudioPlanCommissionLabelMap,
  getTierCommissionLabelMapByItemType,
  resolveStudioPlanPricingConfig,
} from "@/lib/studio-plan-pricing-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Plans and pricing",
  description:
    "Simple plans from €19/month. Shop, bookings, or both — in one place.",
  path: "/pricing",
});

function buildComparisonRows(
  productPct: Record<StudioPlan["key"], string>,
  bookingPct: Record<StudioPlan["key"], string>,
): { label: string; cells: Record<StudioPlan["key"], string | boolean> }[] {
  return [
    { label: "Public studio page", cells: { bookings: true, shop: true, both: true, pro: true } },
    { label: "Online class bookings + checkout", cells: { bookings: true, shop: "—", both: true, pro: true } },
    { label: "Product shop + stock", cells: { bookings: "—", shop: true, both: true, pro: true } },
    { label: "Unified dashboard (shop + classes)", cells: { bookings: "—", shop: "—", both: true, pro: true } },
    { label: "Branding controls", cells: { bookings: "Basic", shop: "Basic", both: true, pro: true } },
    { label: "Platform fee on product sales (your tier)", cells: { bookings: productPct.bookings, shop: productPct.shop, both: productPct.both, pro: productPct.pro } },
    { label: "Platform fee on class bookings (your tier)", cells: { bookings: bookingPct.bookings, shop: bookingPct.shop, both: bookingPct.both, pro: bookingPct.pro } },
    { label: "Advanced analytics & automation", cells: { bookings: "Add-ons", shop: "Add-ons", both: "Add-ons", pro: true } },
    { label: "Priority support", cells: { bookings: "—", shop: "—", both: "—", pro: true } },
  ];
}

function Cell({ value }: { value: string | boolean }) {
  if (value === true) {
    return <span className="text-emerald-400">Included</span>;
  }
  if (value === false) {
    return <span className="text-[var(--muted)]">—</span>;
  }
  return <span className="text-[var(--muted)]">{value}</span>;
}

export default async function PricingPage() {
  const commissionLabel = await getMarketingCheckoutCommissionPctLabel();
  const [pricingConfig, commissionLabelByPlan, tierPct] = await Promise.all([
    resolveStudioPlanPricingConfig(),
    getStudioPlanCommissionLabelMap(),
    getTierCommissionLabelMapByItemType(),
  ]);
  const STUDIO_PLANS = buildStudioPlans(commissionLabelByPlan, pricingConfig);
  const COMPARISON_ROWS = buildComparisonRows(tierPct.product, tierPct.booking);
  const pricingJsonLd = toJsonLdScript(
    softwareApplicationJsonLd({
      name: "PotteryMania",
      description:
        "Pottery studio software to sell ceramics online, accept bookings, and run classes and storefronts from one platform.",
      path: "/pricing",
      offers: STUDIO_PLANS.map((plan) => ({
        name: plan.name,
        price: plan.monthlyCents / 100,
      })),
    }),
  );

  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-10 sm:py-14`}>
        <div className="max-w-3xl">
          <p className={ui.overline}>Pricing</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-[var(--foreground)] sm:text-5xl">
            One place for your shop and your classes
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
            Your public page, bookings, and product sales stay under one roof.
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Pick the plan that fits how you work. Switch anytime.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STUDIO_PLANS.map((plan) => (
            <article
              key={plan.key}
              className={`relative flex flex-col rounded-[1.35rem] border p-5 shadow-sm ${
                plan.recommended
                  ? "border-[var(--accent)] bg-[var(--accent-muted)] ring-2 ring-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              {plan.recommended ? (
                <p className="absolute -top-3 left-4 rounded-full bg-[var(--accent)] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Most popular
                </p>
              ) : null}
              <h2 className="font-serif text-xl text-[var(--foreground)]">{plan.name}</h2>
              <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{monthlyLabel(plan)}</p>
              <p className="text-xs text-[var(--muted)]">{annualEquivalentLabel(plan)}</p>
              <p className="mt-3 text-sm text-[var(--muted)]">{plan.headline}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-[var(--muted)]">
                {plan.includes.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-emerald-400" aria-hidden>
                      ✓
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/dashboard/studio/new?setup=${plan.key === "pro" ? "both" : plan.key}`}
                className={`mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition ${
                  plan.recommended
                    ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                    : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                }`}
              >
                {plan.recommended ? "Get started" : `Choose ${plan.name}`}
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-6 text-sm text-[var(--muted)]">
          <strong className="text-[var(--foreground)]">Bookings</strong> or <strong className="text-[var(--foreground)]">Shop</strong> alone: from €19/month.
          Both together: <strong className="text-[var(--foreground)]">Studio</strong> (€29).
        </p>

        <div className="mt-14">
          <h2 className="font-serif text-2xl text-[var(--foreground)] sm:text-3xl">Compare plans</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">What each plan includes.</p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)]">
                  <th className="px-4 py-3 font-semibold text-[var(--foreground)]">What you get</th>
                  {STUDIO_PLANS.map((p) => (
                    <th key={p.key} className="px-3 py-3 text-center font-semibold text-[var(--foreground)]">
                      {p.name}
                      {p.recommended ? (
                        <span className="mt-1 block text-[10px] font-bold uppercase text-[var(--accent)]">Popular</span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-[var(--border)]">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{row.label}</td>
                    {STUDIO_PLANS.map((p) => (
                      <td key={p.key} className="px-3 py-3 text-center">
                        <Cell value={row.cells[p.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div id="faq" className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <h2 className="font-serif text-xl text-[var(--foreground)] sm:text-2xl">Common questions</h2>
          <dl className="mt-4 space-y-4 text-sm text-[var(--muted)]">
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Do I pay commission on sales?</dt>
              <dd className="mt-1">
                Fees depend on your plan (often around {commissionLabel} — see the table). Card fees from Stripe still apply.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Can I start with only classes or only products?</dt>
              <dd className="mt-1">Yes — pick Bookings or Shop at €19 each, then upgrade to Studio when both are live.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Can I cancel anytime?</dt>
              <dd className="mt-1">Yes. Change or cancel from your studio settings.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">What happens after the free period ends?</dt>
              <dd className="mt-1">Pick a plan that fits your studio. Some features turn on once you subscribe.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">How is VAT handled?</dt>
              <dd className="mt-1">Taxes may apply. Each studio handles its own tax setup.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Which countries are supported?</dt>
              <dd className="mt-1">
                Studios in countries Stripe supports can take payments from buyers worldwide. You handle shipping and local rules.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Can I use my own domain?</dt>
              <dd className="mt-1">Yes. Your studio page can use your own domain as you grow.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">What payment methods do my customers see?</dt>
              <dd className="mt-1">Buyers see the payment methods your Stripe account allows in your region.</dd>
            </div>
          </dl>
          <Link
            href="/dashboard/studio/new?setup=both"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--accent)] px-8 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
          >
            Create your studio
          </Link>
        </div>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: pricingJsonLd }} />
    </MarketingLayout>
  );
}
