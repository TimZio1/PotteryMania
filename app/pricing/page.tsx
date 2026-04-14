import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";
import { ui } from "@/lib/ui-styles";
import type { StudioPlan } from "@/lib/studio-plan-pricing";
import { annualEquivalentLabel, monthlyLabel, STUDIO_PLANS } from "@/lib/studio-plan-pricing";

export const metadata: Metadata = buildMetadata({
  title: "Plans & pricing — studio shop + bookings",
  description:
    "Free until 1 May 2026. No payment required. One system replaces scattered tools — sell products, book classes, and run your studio from €19/month after launch.",
  path: "/pricing",
});

const COMPARISON_ROWS: { label: string; cells: Record<StudioPlan["key"], string | boolean> }[] = [
  { label: "Public studio page", cells: { bookings: true, shop: true, both: true, pro: true } },
  { label: "Online class bookings + checkout", cells: { bookings: true, shop: "—", both: true, pro: true } },
  { label: "Product shop + stock", cells: { bookings: "—", shop: true, both: true, pro: true } },
  { label: "Unified dashboard (shop + classes)", cells: { bookings: "—", shop: "—", both: true, pro: true } },
  { label: "Branding controls", cells: { bookings: "Basic", shop: "Basic", both: true, pro: true } },
  { label: "0% platform commission", cells: { bookings: true, shop: true, both: true, pro: true } },
  { label: "Advanced analytics & automation", cells: { bookings: "Add-ons", shop: "Add-ons", both: "Add-ons", pro: true } },
  { label: "Priority support", cells: { bookings: "—", shop: "—", both: "—", pro: true } },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) {
    return <span className="text-emerald-400">Included</span>;
  }
  if (value === false) {
    return <span className="text-[var(--muted)]">—</span>;
  }
  return <span className="text-[var(--muted)]">{value}</span>;
}

export default function PricingPage() {
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-10 sm:py-14`}>
        <div className="max-w-3xl">
          <p className={ui.overline}>Pricing</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-[var(--foreground)] sm:text-5xl">
            One tool that makes you money
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
            This replaces multiple tools you are currently using — site, bookings, shop, and the messy glue between them.
          </p>
          <p className="mt-3 text-base font-semibold text-[var(--foreground)]">Free until 1 May 2026. No payment required.</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Your studio is free until official launch on 1 May 2026. After that, choose a plan to continue. No credit card
            needed to start.
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
                {plan.recommended ? "Get Studio" : `Choose ${plan.name}`}
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-6 text-sm text-[var(--muted)]">
          <strong className="text-[var(--foreground)]">Bookings</strong> and <strong className="text-[var(--foreground)]">Shop</strong> each
          start at €19/month when you only need one side of the business. <strong className="text-[var(--foreground)]">Studio</strong>{" "}
          (€29) is the best value when you run both — that&apos;s why most owners land here.
        </p>

        <div className="mt-14">
          <h2 className="font-serif text-2xl text-[var(--foreground)] sm:text-3xl">Compare plans</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Simple view of what each tier unlocks.</p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)]">
                  <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Capability</th>
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
          <h2 className="font-serif text-xl text-[var(--foreground)] sm:text-2xl">Questions studios actually ask</h2>
          <dl className="mt-4 space-y-4 text-sm text-[var(--muted)]">
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Do I pay commission on sales?</dt>
              <dd className="mt-1">0% platform commission on checkout — you keep your margin; Stripe fees still apply.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Can I start with only classes or only products?</dt>
              <dd className="mt-1">Yes — pick Bookings or Shop at €19 each, then upgrade to Studio when both are live.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Can I cancel anytime?</dt>
              <dd className="mt-1">Yes. You can change or cancel your paid plan from your studio settings based on the billing terms in effect at that time.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">What happens after the free period ends?</dt>
              <dd className="mt-1">You will choose the plan that matches your studio setup. If you do nothing, paid features may be limited until a plan is selected.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">How is VAT handled?</dt>
              <dd className="mt-1">Applicable taxes may be added where required by law. Your studio remains responsible for its own tax setup and obligations.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Which countries are supported?</dt>
              <dd className="mt-1">PotteryMania works worldwide — any studio in a Stripe-supported country can accept payments from customers anywhere. Shipping, taxes, and local regulations remain the studio&apos;s responsibility.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Can I use my own domain?</dt>
              <dd className="mt-1">Yes. PotteryMania is built around a studio-owned public page and supports a path toward using your own domain as your studio grows.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">What payment methods do my customers see?</dt>
              <dd className="mt-1">Customer payment methods depend on your Stripe setup and the checkout options supported in your region.</dd>
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
    </MarketingLayout>
  );
}
