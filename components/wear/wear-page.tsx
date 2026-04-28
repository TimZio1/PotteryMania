import Image from "next/image";
import Link from "next/link";
import {
  getWearSpreadshopUrl,
  WEAR_PREVIEW_ITEMS,
  WEAR_VISUAL_IMAGES,
  type WearPreviewItem,
} from "@/lib/wear-config";
import { WEAR_CURRENCY_LANDING_LINE } from "@/lib/wear-currency-policy";
import { wearActiveDropEyebrow } from "@/lib/wear-drop-config";
import { WEAR_SHIPPING_DELIVERY_RANGES, WEAR_SHIPPING_LANDING_STRIP } from "@/lib/wear-shipping-copy";
import { WearAnalytics } from "./wear-analytics";
import { WearOutboundLink } from "./wear-outbound-link";
import { WearBuyXGetYLandingBanner } from "./wear-buy-x-get-y-landing-banner";

const heroCtaClass =
  "pm-btn pm-btn--heat group";

const sectionCtaClass =
  "pm-btn group";

const textLinkClass =
  "text-sm font-semibold uppercase tracking-[0.14em] text-(--clay)/70 underline decoration-(--clay)/25 underline-offset-4 transition hover:text-(--heat) hover:decoration-(--heat)";

export function WearPage({ previewItems }: { previewItems?: WearPreviewItem[] }) {
  const spreadshopUrl = getWearSpreadshopUrl();
  const tiles = previewItems?.length ? previewItems : WEAR_PREVIEW_ITEMS;

  return (
    <>
      <WearAnalytics />
      <main className="pm-brand bg-(--ink) text-(--clay)">
        <WearBuyXGetYLandingBanner className="relative z-20" />
        <section className="relative isolate min-h-[calc(100svh-8rem)] overflow-hidden bg-(--ink)">
          <Image
            src={WEAR_VISUAL_IMAGES.primary}
            alt={WEAR_VISUAL_IMAGES.primaryAlt}
            fill
            className="object-cover opacity-55 saturate-75"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,74,28,0.20),transparent_34%),linear-gradient(180deg,rgba(11,11,11,0.30),rgba(11,11,11,0.92)_72%)]" />
          <div className="relative mx-auto flex min-h-[calc(100svh-8rem)] max-w-7xl flex-col justify-end px-6 py-16 sm:px-10 sm:py-24">
            <p className="pm-caption text-(--heat)">{wearActiveDropEyebrow()}</p>
            <h1 className="pm-display mt-6 max-w-6xl text-[4.2rem] leading-[0.88] text-(--clay) sm:text-[7rem] lg:text-[10rem]">
              Made with
              <br />
              <span className="text-(--heat)">heat.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-(--clay)/78 sm:text-xl">
              T-shirts and hoodies for people who don&apos;t sit still. Small runs, heavy ink, built for the hands that make the work.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <Link href="/wear/shop" className={heroCtaClass}>
                Shop the drop
                <span aria-hidden className="ml-3 transition group-hover:translate-x-0.5">→</span>
              </Link>
              <Link href="/wear/partner" className={textLinkClass}>
                Partner program
              </Link>
              {spreadshopUrl ? (
                <WearOutboundLink
                  href={spreadshopUrl}
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-(--clay)/35 underline decoration-(--clay)/20 underline-offset-4 transition hover:text-(--clay)"
                  eventName="wear_hero_spreadshop_fallback"
                >
                  Legacy catalog
                </WearOutboundLink>
              ) : null}
            </div>
            <p className="pm-caption mt-10 text-(--clay)/45">
              30-day returns · Worldwide shipping · Free EU shipping on orders over €50
            </p>
          </div>
        </section>

        <section className="bg-(--clay) px-6 py-16 text-(--ink) sm:px-10 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="pm-caption text-(--shadow)">The drop</p>
                <h2 className="pm-display mt-3 text-[3.2rem] text-(--ink) sm:text-[5rem]">
                  Live pieces.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-(--shadow) sm:text-right">
                Preview what&apos;s live now. Sizes, colors, checkout, and shipping are handled on each product page.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map((item) => {
                const inner = (
                  <>
                    <div className="relative aspect-3/4 overflow-hidden bg-(--ink) ring-1 ring-(--ink)/10">
                      <Image
                        src={item.imageSrc}
                        alt={item.imageAlt}
                        fill
                        className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                      />
                      <span className="absolute inset-0 bg-(--ink)/0 transition group-hover:bg-(--ink)/20" />
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-4">
                      <h3 className="text-sm font-semibold uppercase leading-snug tracking-[0.08em] text-(--ink)">{item.name}</h3>
                      {item.priceLabel ? (
                        <p className="shrink-0 text-sm font-semibold text-(--heat)">{item.priceLabel}</p>
                      ) : null}
                    </div>
                  </>
                );
                return (
                  <article key={item.id} className="flex flex-col">
                    {item.slug ? (
                      <Link href={`/wear/${item.slug}`} className="group block">
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
                <span aria-hidden className="ml-3 transition group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-(--ink) px-6 py-16 text-(--clay) sm:px-10 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="pm-caption text-(--heat)">How it ships</p>
              <h2 className="pm-display mt-4 text-[3rem] sm:text-[4.75rem]">
                Cold facts.
              </h2>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-(--clay)/72 sm:text-base">
              <p>{WEAR_SHIPPING_LANDING_STRIP}</p>
              <p>{WEAR_SHIPPING_DELIVERY_RANGES}</p>
              <p className="text-xs uppercase tracking-[0.12em] text-(--clay)/45">{WEAR_CURRENCY_LANDING_LINE}</p>
              <p className="pt-4 text-xs text-(--clay)/55">
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
          </div>
        </section>
      </main>
    </>
  );
}
