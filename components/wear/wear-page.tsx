import Image from "next/image";
import Link from "next/link";
import {
  getWearSpreadshopUrl,
  WEAR_PREVIEW_ITEMS,
  WEAR_VISUAL_IMAGES,
  type WearPreviewItem,
} from "@/lib/wear-config";
import { WEAR_SHIPPING_DELIVERY_RANGES, WEAR_SHIPPING_LANDING_STRIP } from "@/lib/wear-shipping-copy";
import { WearAnalytics } from "./wear-analytics";
import { WearOutboundLink } from "./wear-outbound-link";

const heroCtaClass =
  "inline-flex min-h-12 items-center justify-center border border-amber-300/60 bg-white px-8 text-sm font-medium tracking-wide text-stone-900 transition hover:bg-amber-50/90";

const sectionCtaClass =
  "inline-flex min-h-11 items-center justify-center border border-amber-800/50 bg-amber-950 px-6 text-sm font-medium tracking-wide text-white transition hover:bg-amber-900";

const textLinkClass =
  "text-sm font-medium text-stone-600 underline decoration-stone-400/60 underline-offset-4 transition hover:text-amber-950 hover:decoration-amber-700/60";

export function WearPage({ previewItems }: { previewItems?: WearPreviewItem[] }) {
  const spreadshopUrl = getWearSpreadshopUrl();
  const tiles = previewItems?.length ? previewItems : WEAR_PREVIEW_ITEMS;

  return (
    <>
      <WearAnalytics />
      <main className="bg-[#f7f2ec] text-stone-900">
        {/* Section 1 — Hero (identity + single CTA) */}
        <section className="border-b border-stone-200/80 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Drop 01</p>
            <h1 className="mt-4 font-serif text-3xl leading-snug tracking-tight text-amber-950 sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
              Clothes for people who build things with their hands.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-stone-600 sm:text-lg">
              Small runs. No warehouse. Each piece is printed when you order — for you, not for a shelf.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4">
              <Link href="/wear/shop" className={heroCtaClass}>
                Shop the drop
              </Link>
              <Link href="/wear/partner" className={textLinkClass}>
                Partner program
              </Link>
              {spreadshopUrl ? (
                <WearOutboundLink
                  href={spreadshopUrl}
                  className="text-xs text-stone-400 underline decoration-stone-400/50 underline-offset-4 transition hover:text-amber-950"
                  eventName="wear_hero_spreadshop_fallback"
                >
                  Legacy catalog
                </WearOutboundLink>
              ) : null}
            </div>
            <div className="relative mx-auto mt-14 aspect-[21/9] max-w-3xl overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-100 sm:aspect-[2/1]">
              <Image
                src={WEAR_VISUAL_IMAGES.primary}
                alt={WEAR_VISUAL_IMAGES.primaryAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 48rem"
                priority
              />
            </div>
          </div>
        </section>

        {/* Section 2 — The drop (products only) */}
        <section className="border-b border-stone-200/80 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-serif text-2xl text-amber-950 sm:text-3xl">The drop</h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm text-stone-600">
              Preview what&apos;s live in the shop — sizes, colors, and checkout on each product page.
            </p>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map((item) => {
                const inner = (
                  <>
                    <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-stone-200/90 ring-1 ring-stone-200">
                      <Image
                        src={item.imageSrc}
                        alt={item.imageAlt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <h3 className="mt-4 font-medium leading-snug text-stone-900">{item.name}</h3>
                    {item.priceLabel ? <p className="mt-1 text-sm text-stone-500">{item.priceLabel}</p> : null}
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
                View all pieces
              </Link>
            </div>
          </div>
        </section>

        {/* Section 3 — Trust + shipping */}
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">How it ships</p>
            <p className="mt-4 text-sm leading-relaxed text-stone-700">{WEAR_SHIPPING_LANDING_STRIP}</p>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">{WEAR_SHIPPING_DELIVERY_RANGES}</p>
            <p className="mt-8 text-xs text-stone-500">
              Questions?{" "}
              <Link href="/wear/partner" className={textLinkClass}>
                Partners
              </Link>{" "}
              ·{" "}
              <Link href="/wear/cart" className={textLinkClass}>
                Cart
              </Link>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
