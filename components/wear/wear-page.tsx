import Image from "next/image";
import Link from "next/link";
import {
  getWearSpreadshopUrl,
  WEAR_PREVIEW_ITEMS,
  WEAR_VISUAL_IMAGES,
  type WearPreviewItem,
} from "@/lib/wear-config";
import { WearAnalytics } from "./wear-analytics";
import { WearOutboundLink } from "./wear-outbound-link";

const heroCtaClass =
  "inline-flex min-h-12 items-center justify-center border border-amber-200/40 bg-white px-8 text-sm font-medium tracking-wide text-(--brand-ink) transition hover:bg-amber-50/90";

const sectionCtaClass =
  "inline-flex min-h-11 items-center justify-center border border-amber-800/50 bg-amber-950 px-6 text-sm font-medium tracking-wide text-white transition hover:bg-amber-900";

const bridgeLinkClass =
  "text-sm font-medium text-stone-500 underline decoration-stone-400/60 underline-offset-4 transition hover:text-amber-950 hover:decoration-amber-700/60";

export function WearPage({ previewItems }: { previewItems?: WearPreviewItem[] }) {
  const spreadshopUrl = getWearSpreadshopUrl();
  const tiles = previewItems?.length ? previewItems : WEAR_PREVIEW_ITEMS;

  return (
    <>
      <WearAnalytics />
      <main className="bg-gradient-to-b from-[#231a15] via-[#1a1310] to-[#14100d] text-stone-100">
        {/* Hero */}
        <section className="border-b border-stone-800/35 px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-serif text-3xl leading-snug tracking-tight text-stone-50 sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              Wear the work you actually ship.
            </p>
            <p className="mt-8 font-serif text-xl text-stone-300 sm:text-2xl">
              Studio-grade merch without handing your story to generic platforms. Built for makers who outgrew
              templates.
            </p>
            <p className="mt-12 text-sm font-medium uppercase tracking-[0.35em] text-stone-500">Wear what you build.</p>
            <div className="mt-10 flex flex-col items-center gap-4">
              <Link href="/wear/shop" className={heroCtaClass}>
                Enter shop
              </Link>
              {spreadshopUrl ? (
                <WearOutboundLink
                  href={spreadshopUrl}
                  className="text-xs text-stone-500 underline decoration-stone-500/50 underline-offset-4 transition hover:text-amber-100/90"
                  eventName="wear_hero_spreadshop_fallback"
                >
                  Open legacy Spreadshop
                </WearOutboundLink>
              ) : null}
            </div>
          </div>
        </section>

        {/* Visual block */}
        <section className="border-b border-stone-800/35">
          <div className="mx-auto grid max-w-6xl gap-px bg-stone-800/30 sm:grid-cols-2">
            <div className="relative aspect-[4/5] bg-[#2c221c] sm:aspect-auto sm:min-h-[min(70vh,520px)]">
              <Image
                src={WEAR_VISUAL_IMAGES.primary}
                alt={WEAR_VISUAL_IMAGES.primaryAlt}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
                priority
              />
            </div>
            <div className="relative aspect-[4/5] bg-[#2c221c] sm:aspect-auto sm:min-h-[min(70vh,520px)]">
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

        {/* Preview — light band for separation, still minimal */}
        <section className="border-b border-stone-200/80 bg-[#f7f2ec] px-4 py-16 text-(--brand-ink) sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-stone-500">A glimpse</p>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {tiles.map((item) => {
                const inner = (
                  <>
                    <div className="relative aspect-[3/4] overflow-hidden bg-stone-200/90">
                      <Image
                        src={item.imageSrc}
                        alt={item.imageAlt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                    <h3 className="mt-4 font-medium leading-snug text-neutral-900">{item.name}</h3>
                    {item.priceLabel ? (
                      <p className="mt-1 text-sm text-neutral-500">{item.priceLabel}</p>
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
                View full collection
              </Link>
            </div>
            {spreadshopUrl ? (
              <p className="mt-6 text-center">
                <WearOutboundLink
                  href={spreadshopUrl}
                  className="text-xs text-stone-600 underline decoration-stone-400/60 underline-offset-4"
                  eventName="wear_preview_spreadshop_fallback"
                >
                  Prefer the old Spreadshop storefront
                </WearOutboundLink>
              </p>
            ) : null}
          </div>
        </section>

        {/* Statement */}
        <section className="px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center font-serif text-xl leading-relaxed text-stone-300 sm:text-2xl sm:leading-relaxed">
            <p>You create on your terms.</p>
            <p className="mt-6">You don’t follow trends.</p>
            <p className="mt-6">You build your own space.</p>
            <p className="mt-10 text-amber-100">Now you can wear it.</p>
          </div>
        </section>

        {/* Bridge */}
        <section className="border-t border-stone-800/35 bg-[#1f1814]/90 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-500">PotteryMania</p>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              Bookings, ceramics, and a website platform built for studios — not algorithms.
            </p>
            <nav
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8"
              aria-label="Continue on PotteryMania"
            >
              <Link href="/dashboard/studio/new?setup=bookings" className={bridgeLinkClass}>
                Start bookings setup
              </Link>
              <Link href="/dashboard/studio/new?setup=shop" className={bridgeLinkClass}>
                Start shop setup
              </Link>
              <Link href="/dashboard/studio/new?setup=both" className={bridgeLinkClass}>
                Create studio website
              </Link>
            </nav>
          </div>
        </section>
      </main>
    </>
  );
}
