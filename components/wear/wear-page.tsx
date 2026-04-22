import Image from "next/image";
import Link from "next/link";
import { SOCIAL_PROOF_BASE } from "@/lib/brand";
import {
  getWearSpreadshopUrl,
  WEAR_PREVIEW_ITEMS,
  WEAR_VISUAL_IMAGES,
  type WearPreviewItem,
} from "@/lib/wear-config";
import { WearAnalytics } from "./wear-analytics";
import { WearOutboundLink } from "./wear-outbound-link";
import { WearResellerProgramLink } from "./wear-reseller-program-link";

const heroCtaClass =
  "inline-flex min-h-12 items-center justify-center border border-amber-300/60 bg-white px-8 text-sm font-medium tracking-wide text-stone-900 transition hover:bg-amber-50/90";

const sectionCtaClass =
  "inline-flex min-h-11 items-center justify-center border border-amber-800/50 bg-amber-950 px-6 text-sm font-medium tracking-wide text-white transition hover:bg-amber-900";

const bridgeLinkClass =
  "text-sm font-medium text-stone-500 underline decoration-stone-400/60 underline-offset-4 transition hover:text-amber-950 hover:decoration-amber-700/60";

function formatEur(amount: number) {
  return `EUR ${amount.toFixed(2)}`;
}

export function WearPage({
  previewItems,
  resellerStats,
  resellerProgramHref,
}: {
  previewItems?: WearPreviewItem[];
  resellerStats: {
    activeCreators: number;
    marginPct: string;
    estimatedEarningPerSale: number;
  };
  resellerProgramHref: string;
}) {
  const spreadshopUrl = getWearSpreadshopUrl();
  const tiles = previewItems?.length ? previewItems : WEAR_PREVIEW_ITEMS;
  const displayedCreators = resellerStats.activeCreators + SOCIAL_PROOF_BASE;

  return (
    <>
      <WearAnalytics />
      <main className="bg-[#f7f2ec] text-stone-900">
        {/* Hero */}
        <section className="border-b border-stone-200/80 px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-serif text-3xl leading-snug tracking-tight text-amber-950 sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              Wear the work you actually ship.
            </p>
            <p className="mt-8 font-serif text-xl text-stone-600 sm:text-2xl">
              Branded shirts and hoodies for your studio. Printed when someone orders. No boxes in your garage.
            </p>
            <p className="mt-6 text-sm font-medium text-amber-900">
              Join the reseller program and earn {resellerStats.marginPct} on every sale, roughly{" "}
              {formatEur(resellerStats.estimatedEarningPerSale)} per item.
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-500">
              {displayedCreators.toLocaleString()} creators already selling wearables
            </p>
            <div className="mt-10 flex flex-col items-center gap-4">
              <Link href="/wear/shop" className={heroCtaClass}>
                Shop now
              </Link>
              {spreadshopUrl ? (
                <WearOutboundLink
                  href={spreadshopUrl}
                  className="text-xs text-stone-500 underline decoration-stone-500/50 underline-offset-4 transition hover:text-amber-950"
                  eventName="wear_hero_spreadshop_fallback"
                >
                  Older shop
                </WearOutboundLink>
              ) : null}
            </div>
          </div>
        </section>

        {/* Visual block */}
        <section className="border-b border-stone-200/80">
          <div className="mx-auto grid max-w-6xl gap-px bg-stone-200/80 sm:grid-cols-2">
            <div className="relative aspect-4/5 bg-stone-100 sm:aspect-auto sm:min-h-[min(70vh,520px)]">
              <Image
                src={WEAR_VISUAL_IMAGES.primary}
                alt={WEAR_VISUAL_IMAGES.primaryAlt}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
                priority
              />
            </div>
            <div className="relative aspect-4/5 bg-stone-100 sm:aspect-auto sm:min-h-[min(70vh,520px)]">
              <Image
                src={WEAR_VISUAL_IMAGES.secondary}
                alt={WEAR_VISUAL_IMAGES.secondaryAlt}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>

        {/* Preview section with a light band for separation */}
        <section className="border-b border-stone-200/80 bg-[#f7f2ec] px-4 py-16 text-stone-900 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-stone-500">A glimpse</p>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {tiles.map((item) => {
                const inner = (
                  <>
                    <div className="relative aspect-3/4 overflow-hidden bg-stone-200/90">
                      <Image
                        src={item.imageSrc}
                        alt={item.imageAlt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                    <h3 className="mt-4 font-medium leading-snug text-stone-900">{item.name}</h3>
                    {item.priceLabel ? (
                      <p className="mt-1 text-sm text-stone-500">{item.priceLabel}</p>
                    ) : null}
                  </>
                );
                return (
                  <article key={item.id} className="flex flex-col">
                    {item.slug ? (
                      <Link href={`/wear/${item.slug}`} className="group block transition hover:opacity-90">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </article>
                );
              })}
            </div>
            <div className="mt-12 text-center">
              <Link href="/wear/shop" className={sectionCtaClass}>
                See the full collection
              </Link>
            </div>
            {spreadshopUrl ? (
              <p className="mt-6 text-center">
                <WearOutboundLink
                  href={spreadshopUrl}
                  className="text-xs text-stone-600 underline decoration-stone-400/60 underline-offset-4"
                  eventName="wear_preview_spreadshop_fallback"
                >
                  Open the older store
                </WearOutboundLink>
              </p>
            ) : null}
          </div>
        </section>

        {/* Statement */}
        <section className="border-b border-stone-200/80 bg-white px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center font-serif text-xl leading-relaxed text-stone-700 sm:text-2xl sm:leading-relaxed">
            <p>You create on your terms.</p>
            <p className="mt-6">You don’t follow trends.</p>
            <p className="mt-6">You build your own space.</p>
            <p className="mt-10 text-amber-900">Now you can wear it.</p>
          </div>
        </section>

        {/* Reseller program */}
        <section className="border-b border-stone-200/80 bg-[#fbf7f2] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-stone-500">
              Reseller program
            </p>
            <h2 className="mt-4 text-center font-serif text-3xl text-amber-950 sm:text-4xl">
              Sell wearables under your studio brand
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-stone-600">
              Storefront, checkout, and fulfilment in one place. Pick what you sell, publish it on your studio page,
              and keep your margin on every sale.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">1. Join</p>
                <p className="mt-3 text-lg font-semibold text-stone-900">Turn on your shop</p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  From your dashboard, turn on wearables and pick what you sell.
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">2. Sell</p>
                <p className="mt-3 text-lg font-semibold text-stone-900">Share your studio identity</p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  Items show on your studio page, so people buy from you — not a random third-party store.
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">3. Earn</p>
                <p className="mt-3 text-lg font-semibold text-stone-900">
                  {resellerStats.marginPct} margin, about {formatEur(resellerStats.estimatedEarningPerSale)} per sale
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  Your earnings depend on your margin and the item price. Printing and shipping are handled for you.
                </p>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <WearResellerProgramLink href={resellerProgramHref} className={sectionCtaClass}>
                Join the program
              </WearResellerProgramLink>
              <Link href="/wear/shop" className={bridgeLinkClass}>
                Browse the shop
              </Link>
            </div>
          </div>
        </section>

        {/* Bridge */}
        <section className="bg-[#f3ece4] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-500">Studio platform</p>
            <p className="mt-4 text-sm leading-relaxed text-stone-600">
              Run classes, sell work, and host this wear line from one studio home.
            </p>
            <nav
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8"
              aria-label="Continue setting up your studio"
            >
              <Link href="/dashboard/studio/new?setup=both" className={bridgeLinkClass}>
                Set up your studio
              </Link>
              <Link href="/pricing" className={bridgeLinkClass}>
                See pricing
              </Link>
            </nav>
          </div>
        </section>
      </main>
    </>
  );
}
