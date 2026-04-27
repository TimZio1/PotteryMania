import Link from "next/link";
import type { Metadata } from "next";
import { WearResellerProgramLink } from "@/components/wear/wear-reseller-program-link";
import { buildMetadata } from "@/lib/seo";
import { resolveWearResellerApplicationHref } from "@/lib/wear-reseller-application";
import { WEAR_SHIPPING_DELIVERY_RANGES } from "@/lib/wear-shipping-copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Affiliate program — PotteryMania",
  description:
    "Promote PotteryMania apparel and earn 10% commission on qualifying sales. No inventory or shipping to manage.",
  path: "/wear/partner",
});

export default async function WearPartnerPage() {
  const applyHref = resolveWearResellerApplicationHref();

  return (
    <main className="min-h-[70vh] bg-[#f7f2ec] px-4 py-12 text-stone-900 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Affiliate program</p>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-amber-950 sm:text-5xl">
              Promote PotteryMania apparel. Earn 10%.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700">
              Share tees and hoodies with your audience. You get a tracked link/code — we run the shop, fulfillment,
              support, and payouts. You earn when people buy.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <WearResellerProgramLink
                href={applyHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950 px-6 text-sm font-semibold text-white transition hover:bg-amber-900"
              >
                Become an affiliate
              </WearResellerProgramLink>
              <Link
                href="/wear/shop"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-stone-300 bg-white px-6 text-sm font-semibold text-stone-800 transition hover:border-amber-400/80"
              >
                See the products
              </Link>
            </div>
          </div>

          <dl className="grid gap-3 rounded-3xl border border-amber-200/80 bg-white p-5 shadow-sm">
            <div className="rounded-2xl bg-amber-50/80 px-4 py-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">Commission</dt>
              <dd className="mt-1 font-serif text-4xl text-amber-950">10%</dd>
              <p className="mt-1 text-xs text-stone-600">After discounts, before shipping and tax.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl bg-stone-50 px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Tracking</dt>
                <dd className="mt-1 font-serif text-3xl text-amber-950">30 days</dd>
              </div>
              <div className="rounded-2xl bg-stone-50 px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Payout</dt>
                <dd className="mt-1 font-serif text-3xl text-amber-950">€50</dd>
              </div>
            </div>
          </dl>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            ["Apply", "Tell us where you promote and who your audience is."],
            ["Get your link", "Use your tracked short link or code when sharing products."],
            ["Earn per sale", "Commission is calculated on the final paid product amount."],
            ["Stripe payout", "Once unpaid commission reaches €50, payout is sent through Stripe."],
          ].map(([title, body], index) => (
            <div key={title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900">
                {index + 1}
              </span>
              <h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-stone-500">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-700">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 space-y-4 rounded-2xl border border-stone-200/80 bg-white/80 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">What you promote</h2>
          <p className="text-sm leading-relaxed text-stone-700">
            <strong>Share links:</strong> approved affiliates can use a short code like{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">yoursite.com/w/your-code</code> and
            open the shop with attribution.
          </p>
          <p className="text-sm leading-relaxed text-stone-600">
            Promote apparel people get instantly: maker tees, hoodies, and studio-ready layers. Buyers see timing and
            shipping at checkout — {WEAR_SHIPPING_DELIVERY_RANGES}.
          </p>
        </section>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <WearResellerProgramLink
            href={applyHref}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950 px-6 text-sm font-medium text-white transition hover:bg-amber-900"
          >
            Apply for the affiliate program
          </WearResellerProgramLink>
          <Link
            href="/wear/shop"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-stone-300 bg-white px-6 text-sm font-medium text-stone-800 transition hover:border-amber-400/80"
          >
            Browse apparel
          </Link>
        </div>

        <p className="mt-10 text-center text-xs text-stone-500">
          Questions?{" "}
          <a href="mailto:affiliates@potterymania.com" className="underline underline-offset-2 hover:text-amber-900">
            affiliates@potterymania.com
          </a>
          <span className="mx-1.5">·</span>
          <Link href="/terms" className="underline underline-offset-2 hover:text-amber-900">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-amber-900">
            Privacy
          </Link>
        </p>
      </div>
    </main>
  );
}
