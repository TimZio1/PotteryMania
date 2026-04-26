import Link from "next/link";
import type { Metadata } from "next";
import { WearResellerProgramLink } from "@/components/wear/wear-reseller-program-link";
import { buildMetadata } from "@/lib/seo";
import { formatWearMarginPercentFromBps, resolveWearGlobalPricing } from "@/lib/wear-commission";
import { resolveWearResellerApplicationHref } from "@/lib/wear-reseller-application";
import { WEAR_SHIPPING_DELIVERY_RANGES } from "@/lib/wear-shipping-copy";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: isApparelOnlyLaunch() ? "Affiliate program — PotteryMania" : "Partner program",
  description: isApparelOnlyLaunch()
    ? "Share our apparel and earn commission on qualifying sales. No inventory or shipping to manage — we print and fulfill."
    : "How partners earn with the drop — margins, attribution, payouts, and natural ways to share the brand.",
  path: "/wear/partner",
});

export default async function WearPartnerPage() {
  const [pricing, applyHref] = await Promise.all([
    resolveWearGlobalPricing(),
    Promise.resolve(resolveWearResellerApplicationHref()),
  ]);
  const defaultMarginLabel = formatWearMarginPercentFromBps(pricing.defaultMarginBps);
  const apparelOnly = isApparelOnlyLaunch();

  return (
    <main className="min-h-[70vh] bg-[#f7f2ec] px-4 py-14 text-stone-900 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          {apparelOnly ? "Affiliate program" : "Partners"}
        </p>
        <h1 className="mt-4 font-serif text-3xl leading-tight text-amber-950 sm:text-4xl">
          {apparelOnly
            ? "Earn 10% on every sale you bring in."
            : "Share the drop — earn on pieces people actually wear"}
        </h1>
        {apparelOnly ? (
          <div className="mt-6 grid gap-3 rounded-2xl border border-amber-200/60 bg-white p-5 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Commission</dt>
              <dd className="mt-1 font-serif text-3xl text-amber-950">10%</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Cookie window</dt>
              <dd className="mt-1 font-serif text-3xl text-amber-950">30 days</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Payouts</dt>
              <dd className="mt-1 font-serif text-3xl text-amber-950">€50</dd>
            </div>
          </div>
        ) : null}
        <p className="mt-6 text-sm leading-relaxed text-stone-700">
          {apparelOnly
            ? "Drop your link, post your favourite tee, and get 10% on every qualifying sale — calculated on the final paid amount, after any active discount. We handle printing, shipping, and customer support."
            : "Share apparel with people who already identify with making things — teachers, artists, and creators who live in clay, wood, metal, or ink."}
        </p>

        {!apparelOnly ? (
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
        ) : (
          <section className="mt-10 space-y-4 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">How it works</h2>
            <ol className="space-y-3 text-sm leading-relaxed text-stone-700">
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-900">1</span>
              Apply below. Once approved, you get a tracked share link.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-900">2</span>
                Share the shop or any product link with your audience.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-900">3</span>
                Earn 10% on every qualifying sale within 30 days of the click.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-900">4</span>
                We print, ship, and support customers — you keep the audience.
              </li>
            </ol>
            <p className="text-xs leading-relaxed text-stone-600">
              Typical delivery ranges: {WEAR_SHIPPING_DELIVERY_RANGES}
            </p>
          </section>
        )}

        <section className="mt-8 space-y-4 rounded-2xl border border-stone-200/80 bg-white/80 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
            {apparelOnly ? "Links & tracking" : "Creators & affiliates"}
          </h2>
          <p className="text-sm leading-relaxed text-stone-700">
            <strong>Share links:</strong> approved affiliates can use a short code so your link looks like{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">yoursite.com/w/your-code</code> and
            opens the shop with attribution. Attribution is stored in the buyer&apos;s browser for{" "}
            <strong>30 days</strong> and passed at checkout when eligible.
          </p>
          {!apparelOnly ? (
            <p className="text-sm leading-relaxed text-stone-700">
              Commission percentage, cookie duration (typically <strong>30 days</strong> last-touch where tracking is
              enabled), and payout thresholds are defined in your partner agreement after approval — we keep the rules
              simple so you can talk like a friend, not a salesperson.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-stone-700">
              <strong>10% commission</strong> is calculated on the final paid amount of every qualifying order — after
              any active discount, before tax and shipping. Cookies last <strong>30 days</strong>, last-touch.
              Payouts are sent through Stripe to your connected account once your unpaid commission reaches €50. No
              multi-level structure, no hidden fees.
            </p>
          )}
          <p className="text-sm leading-relaxed text-stone-600">
            <strong>Natural fit:</strong> what you wear while you work, teach, or show your craft — share with people who
            already care about making.
          </p>
        </section>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <WearResellerProgramLink
            href={applyHref}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950 px-6 text-sm font-medium text-white transition hover:bg-amber-900"
          >
            {apparelOnly ? "Become an Affiliate" : "Apply / get started"}
          </WearResellerProgramLink>
          <Link
            href="/wear/shop"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-stone-300 bg-white px-6 text-sm font-medium text-stone-800 transition hover:border-amber-400/80"
          >
            {apparelOnly ? "Shop apparel" : "Browse the drop"}
          </Link>
        </div>

        <p className="mt-10 text-center text-xs text-stone-500">
          {apparelOnly ? (
            <>
              Questions?{" "}
              <a
                href="mailto:affiliates@potterymania.com"
                className="underline underline-offset-2 hover:text-amber-900"
              >
                affiliates@potterymania.com
              </a>
              <span className="mx-1.5">·</span>
            </>
          ) : null}
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
