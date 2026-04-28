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
    <main className="pm-brand pm-slab-dark relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(255,74,28,0.12),transparent_50%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="pm-caption text-(--heat)">Affiliate program</p>
            <h1 className="pm-display mt-5 text-[2.4rem] text-(--clay) sm:text-[3.2rem] lg:text-[3.6rem]">
              Promote the drop. Earn 10%.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-(--clay)/78 sm:text-lg">
              Share tees and hoodies with your audience. You get a tracked link or code — we run the shop, fulfillment,
              support, and payouts. You earn when people buy.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <WearResellerProgramLink
                href={applyHref}
                className="pm-btn pm-btn--heat group inline-flex min-h-12 flex-1 items-center justify-center sm:min-w-48"
              >
                Become an affiliate
                <span aria-hidden className="ml-2 transition group-hover:translate-x-0.5">
                  →
                </span>
              </WearResellerProgramLink>
              <Link
                href="/wear/shop"
                className="pm-btn pm-btn--ghost inline-flex min-h-12 flex-1 items-center justify-center sm:min-w-48"
              >
                See the products
              </Link>
            </div>
          </div>

          <dl className="grid gap-3 rounded-2xl border border-(--clay)/12 bg-(--clay)/4 p-5 ring-1 ring-(--clay)/8 backdrop-blur-sm">
            <div className="rounded-xl border-l-2 border-(--heat) pl-4">
              <dt className="pm-caption text-(--clay)/70">Commission</dt>
              <dd className="pm-display mt-1 text-(--clay) text-[2.5rem] sm:text-[3rem]">10%</dd>
              <p className="mt-1 text-xs leading-relaxed text-(--clay)/65">After discounts, before shipping and tax.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-xl border border-(--clay)/10 bg-(--ink) px-4 py-3">
                <dt className="pm-caption text-(--clay)/60">Tracking</dt>
                <dd className="pm-display mt-1 text-(--clay) text-[2rem] sm:text-[2.25rem]">30 days</dd>
              </div>
              <div className="rounded-xl border border-(--clay)/10 bg-(--ink) px-4 py-3">
                <dt className="pm-caption text-(--clay)/60">Payout</dt>
                <dd className="pm-display mt-1 text-(--clay) text-[2rem] sm:text-[2.25rem]">€50</dd>
              </div>
            </div>
          </dl>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-4">
          {[
            ["Apply", "Tell us where you promote and who your audience is."],
            ["Get your link", "Use your tracked short link or code when sharing products."],
            ["Earn per sale", "Commission is calculated on the final paid product amount."],
            ["Stripe payout", "Once unpaid commission reaches €50, payout is sent through Stripe."],
          ].map(([title, body], index) => (
            <div
              key={title}
              className="rounded-2xl border border-(--clay)/10 bg-(--clay)/3 p-5 ring-1 ring-(--clay)/6"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--heat) text-sm font-bold text-(--clay)">
                {index + 1}
              </span>
              <h2 className="pm-caption mt-4 text-(--clay)/80">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-(--clay)/70">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 space-y-4 rounded-2xl border border-(--clay)/12 bg-(--clay)/4 p-6 ring-1 ring-(--clay)/8">
          <h2 className="pm-caption text-(--heat)">What you promote</h2>
          <p className="text-sm leading-relaxed text-(--clay)/75">
            <strong className="font-semibold text-(--clay)">Share links:</strong> approved affiliates can use a short code
            like{" "}
            <code className="rounded-md bg-(--ink) px-1.5 py-0.5 font-mono text-[11px] text-(--clay)/90">
              yoursite.com/w/your-code
            </code>{" "}
            and open the shop with attribution.
          </p>
          <p className="text-sm leading-relaxed text-(--clay)/65">
            Promote apparel people get on demand: maker tees, hoodies, and studio-ready layers. Buyers see timing and
            shipping at checkout — {WEAR_SHIPPING_DELIVERY_RANGES}.
          </p>
        </section>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <WearResellerProgramLink
            href={applyHref}
            className="pm-btn pm-btn--heat group inline-flex min-h-12 flex-1 items-center justify-center sm:min-w-56"
          >
            Apply for the program
            <span aria-hidden className="ml-2 transition group-hover:translate-x-0.5">
              →
            </span>
          </WearResellerProgramLink>
          <Link
            href="/wear/shop"
            className="pm-btn pm-btn--ghost inline-flex min-h-12 flex-1 items-center justify-center sm:min-w-40"
          >
            Browse apparel
          </Link>
        </div>

        <p className="mt-12 text-center text-xs text-(--clay)/50">
          Questions?{" "}
          <a
            href="mailto:affiliates@potterymania.com"
            className="font-medium text-(--clay)/80 underline decoration-(--clay)/30 underline-offset-4 transition hover:text-(--heat) hover:decoration-(--heat)"
          >
            affiliates@potterymania.com
          </a>
          <span className="mx-1.5 text-(--clay)/35">·</span>
          <Link
            href="/terms"
            className="font-medium text-(--clay)/80 underline decoration-(--clay)/30 underline-offset-4 transition hover:text-(--heat) hover:decoration-(--heat)"
          >
            Terms
          </Link>
          <span className="text-(--clay)/35"> · </span>
          <Link
            href="/privacy"
            className="font-medium text-(--clay)/80 underline decoration-(--clay)/30 underline-offset-4 transition hover:text-(--heat) hover:decoration-(--heat)"
          >
            Privacy
          </Link>
        </p>
      </div>
    </main>
  );
}
