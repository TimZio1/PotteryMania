import Link from "next/link";
import type { Metadata } from "next";
import { WearResellerProgramLink } from "@/components/wear/wear-reseller-program-link";
import { buildMetadata } from "@/lib/seo";
import { formatWearMarginPercentFromBps, resolveWearGlobalPricing } from "@/lib/wear-commission";
import { resolveWearResellerApplicationHref } from "@/lib/wear-reseller-application";
import { WEAR_SHIPPING_DELIVERY_RANGES } from "@/lib/wear-shipping-copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Partner program",
  description:
    "How partners earn with the drop — margins, attribution, payouts, and natural ways to share the brand.",
  path: "/wear/partner",
});

export default async function WearPartnerPage() {
  const [pricing, applyHref] = await Promise.all([
    resolveWearGlobalPricing(),
    Promise.resolve(resolveWearResellerApplicationHref()),
  ]);
  const defaultMarginLabel = formatWearMarginPercentFromBps(pricing.defaultMarginBps);

  return (
    <main className="min-h-[70vh] bg-[#f7f2ec] px-4 py-14 text-stone-900 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Partners</p>
        <h1 className="mt-4 font-serif text-3xl leading-tight text-amber-950 sm:text-4xl">
          Share the drop — earn on pieces people actually wear
        </h1>
        <p className="mt-6 text-sm leading-relaxed text-stone-700">
          This is not a marketplace pitch. Partners invite people who already identify with making things — teachers,
          studios, and creators who live in clay, wood, metal, or ink.
        </p>

        <section className="mt-10 space-y-6 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Studio sellers</h2>
          <p className="text-sm leading-relaxed text-stone-700">
            Approved studios enable wearables on their profile. Margins stay within platform min/max rules — the
            current default reference is <strong>{defaultMarginLabel}</strong>. Your live rate is confirmed in the
            dashboard once wearables are enabled.
            {pricing.marginLocked ? " Margins are currently fixed by the platform." : ""}
          </p>
          <ul className="space-y-2 text-sm leading-relaxed text-stone-600">
            <li className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-600" aria-hidden />
              Fulfillment and print routing are handled — you focus on audience and story.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-600" aria-hidden />
              Buyers see transparent shipping at checkout; typical ranges: {WEAR_SHIPPING_DELIVERY_RANGES}
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-4 rounded-2xl border border-stone-200/80 bg-white/80 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Creators &amp; affiliates</h2>
          <p className="text-sm leading-relaxed text-stone-700">
            Commission percentage, cookie duration (typically <strong>30 days</strong> last-touch where tracking is
            enabled), and payout thresholds are defined in your partner agreement after approval — we keep the rules
            simple so you can talk like a friend, not a salesperson.
          </p>
          <p className="text-sm leading-relaxed text-stone-600">
            <strong>Natural angles:</strong> what you wear in the studio, loading the kiln, teaching a class, or your
            uniform for open studios — invite people who already get it.
          </p>
        </section>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <WearResellerProgramLink
            href={applyHref}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950 px-6 text-sm font-medium text-white transition hover:bg-amber-900"
          >
            Apply / get started
          </WearResellerProgramLink>
          <Link
            href="/wear/shop"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-stone-300 bg-white px-6 text-sm font-medium text-stone-800 transition hover:border-amber-400/80"
          >
            Browse the drop
          </Link>
        </div>

        <p className="mt-10 text-center text-xs text-stone-500">
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
