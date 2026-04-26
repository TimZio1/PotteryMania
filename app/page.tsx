import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { PrivateGuideForm } from "@/app/early-access/private-guide-form";
import { HomeLaunchStats } from "@/app/home-launch-stats";
import { HomeScrollReset } from "@/app/home-scroll-reset";
import { buildMetadata } from "@/lib/seo";
import { organizationJsonLd, toJsonLdScript, websiteJsonLd } from "@/lib/structured-data";
import { WEAR_VISUAL_IMAGES } from "@/lib/wear-config";
import { findWearPublicProductsWithVariantsRetrying } from "@/lib/wear-public-catalog-query";
import { wearListingImageSrc } from "@/lib/wear-listing-image";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";
import { formatWearMoney } from "@/lib/wear-money";
import { ui } from "@/lib/ui-styles";
import { mapWearProductRowToInternalPrices } from "@/lib/wear-internal-pricing";
import { wearDisplayName } from "@/lib/wear-display-name";

export const dynamic = "force-dynamic";

const IMPACT_SITE_VERIFICATION = "886dc8c3-9975-4330-92e4-e34425f85624";

export async function generateMetadata(): Promise<Metadata> {
  const base = buildMetadata({
    title: "PotteryMania — T-Shirts & Apparel for Makers",
    description:
      "Shop T-shirts, hoodies, and apparel for potters, artists, makers, and creative people. Printed on demand and easy to buy.",
    path: "/",
  });
  return {
    ...base,
    other: {
      "impact-site-verification": IMPACT_SITE_VERIFICATION,
    },
  };
}

async function ApparelHome() {
  const catalog = await findWearPublicProductsWithVariantsRetrying();
  const rows = catalog.ok ? catalog.rows.map(mapWearProductRowToInternalPrices) : [];
  const featured = rows.filter((p) => p.isFeatured).slice(0, 8);
  const showcase = featured.length >= 4 ? featured : rows.slice(0, 8);
  const isHoodieLike = (p: (typeof rows)[number]) =>
    /hoodie|sweat|fleece|pullover/i.test(
      `${p.name} ${p.spreadconnectProductTypeName ?? ""} ${p.subtitle ?? ""}`,
    );
  const hoodies = rows.filter(isHoodieLike);
  const tees = rows.filter((p) => !isHoodieLike(p));
  const heroAnchor = showcase[0] ?? rows[0];
  const minPriceCents = rows.length > 0
    ? rows.reduce((m, p) => (p.priceCents > 0 && p.priceCents < m ? p.priceCents : m), Number.MAX_SAFE_INTEGER)
    : 0;
  const heroFromPrice = minPriceCents && minPriceCents !== Number.MAX_SAFE_INTEGER
    ? formatWearMoney(minPriceCents, rows[0]?.currency ?? "EUR")
    : null;
  const totalActive = rows.length;
  const totalHoodies = hoodies.length;
  const totalTees = tees.length;

  const jsonLd = toJsonLdScript([websiteJsonLd(), organizationJsonLd()]);

  return (
    <MarketingLayout>
      <HomeScrollReset />
      <main className="relative overflow-hidden bg-[#f7f2ec] text-stone-900">
        {/* ── 1. Slim trust bar ──────────────────────────── */}
        <div className="border-b border-amber-950/15 bg-amber-950 text-white">
          <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em]">
            <li>Free EU shipping over €50</li>
            <li className="hidden sm:inline">·</li>
            <li>30-day returns</li>
            <li className="hidden sm:inline">·</li>
            <li>Worldwide shipping</li>
          </ul>
        </div>

        {/* ── 2. Hero ─────────────────────────────────────── */}
        <section className={`${ui.pageContainer} pb-10 pt-10 sm:pb-14 sm:pt-16`} aria-labelledby="hero-headline">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="pm-fade-up">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
                T-shirts & Hoodies · Apparel store
              </p>

              <h1
                id="hero-headline"
                className="mt-4 font-serif text-4xl leading-[1.05] tracking-tight text-amber-950 sm:text-5xl lg:text-[3.75rem]"
              >
                T-shirts &amp; hoodies for makers.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-700 sm:text-lg">
                Soft, durable apparel for potters, artists, and anyone who builds with their hands.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                <Link
                  href="/wear/shop"
                  className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-amber-950/15 bg-amber-950 px-8 text-base font-semibold tracking-wide text-white shadow-[0_8px_28px_-8px_rgba(120,53,15,0.45)] transition hover:bg-amber-900"
                >
                  Shop now
                  {heroFromPrice ? (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium text-amber-50">
                      from {heroFromPrice}
                    </span>
                  ) : null}
                  <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
                </Link>
                <Link
                  href="/wear/shop"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-amber-900 underline-offset-4 hover:underline"
                >
                  Browse the collection <span aria-hidden>→</span>
                </Link>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-5 text-left">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">In stock</dt>
                  <dd className="mt-1 font-serif text-2xl text-amber-950">{totalActive}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">T-shirts</dt>
                  <dd className="mt-1 font-serif text-2xl text-amber-950">{totalTees}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Hoodies</dt>
                  <dd className="mt-1 font-serif text-2xl text-amber-950">{totalHoodies}</dd>
                </div>
              </dl>
            </div>

            <div className="relative">
              <div className="pm-fade-up relative aspect-[4/5] overflow-hidden rounded-3xl border border-amber-950/10 bg-stone-100 shadow-[0_30px_80px_-30px_rgba(28,25,23,0.35)] sm:aspect-[3/4]">
                {heroAnchor ? (
                  (() => {
                    const imgs = wearImageUrlsFromJson(heroAnchor.images);
                    const src = imgs[0];
                    return src ? (
                      <Image
                        src={wearListingImageSrc(src, 1100)}
                        alt={wearDisplayName(heroAnchor)}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        quality={75}
                        priority
                        unoptimized
                      />
                    ) : (
                      <Image
                        src={WEAR_VISUAL_IMAGES.primary}
                        alt={WEAR_VISUAL_IMAGES.primaryAlt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority
                      />
                    );
                  })()
                ) : (
                  <Image
                    src={WEAR_VISUAL_IMAGES.primary}
                    alt={WEAR_VISUAL_IMAGES.primaryAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                )}

                {heroAnchor ? (
                  <Link
                    href={`/wear/${heroAnchor.slug}`}
                    className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-white/30 bg-white/90 px-4 py-3 text-sm text-stone-900 backdrop-blur transition hover:bg-white"
                  >
                    <span className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                        Featured
                      </span>
                      <span className="mt-0.5 font-medium">{wearDisplayName(heroAnchor)}</span>
                    </span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                      {formatWearMoney(heroAnchor.priceCents, heroAnchor.currency)}
                      <span aria-hidden>→</span>
                    </span>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Featured grid ───────────────────────────── */}
        {showcase.length > 0 ? (
          <section className="bg-white/60 py-14 sm:py-20" aria-labelledby="featured-apparel">
            <div className={ui.pageContainer}>
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">The collection</p>
                  <h2 id="featured-apparel" className="mt-2 font-serif text-3xl text-amber-950 sm:text-4xl">
                    Featured apparel
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600">
                    Fresh prints, soft cotton, and the kind of pieces you actually wear in the studio.
                    Updated as new makers drop their designs.
                  </p>
                </div>
                <Link
                  href="/wear/shop"
                  className="inline-flex items-center gap-2 self-start rounded-full border border-amber-950/30 bg-white px-5 py-2 text-sm font-semibold text-amber-950 transition hover:border-amber-800/60 hover:bg-amber-50"
                >
                  Browse all {totalActive ? `(${totalActive})` : ""}
                  <span aria-hidden>→</span>
                </Link>
              </div>
              <ul className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
                {showcase.map((p, idx) => {
                  const imgs = wearImageUrlsFromJson(p.images);
                  const src = imgs[0];
                  const isHero = idx === 0 && showcase.length >= 5;
                  const displayName = wearDisplayName(p);
                  return (
                    <li key={p.id} className={isHero ? "sm:col-span-2 sm:row-span-2" : undefined}>
                      <Link href={`/wear/${p.slug}`} className="group block">
                        <div
                          className={`relative overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-amber-950/10 ${
                            isHero ? "aspect-[4/5] sm:aspect-square" : "aspect-[3/4]"
                          }`}
                        >
                          {src ? (
                            <Image
                              src={wearListingImageSrc(src, isHero ? 900 : 560)}
                              alt={displayName}
                              fill
                              className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                              sizes={isHero ? "(max-width: 640px) 92vw, 50vw" : "(max-width: 640px) 92vw, 25vw"}
                              quality={70}
                              unoptimized
                            />
                          ) : null}
                          <span
                            className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-950 ${
                              p.isFeatured ? "" : "hidden"
                            }`}
                          >
                            ★ Featured
                          </span>
                          <span className="absolute bottom-0 left-0 right-0 translate-y-3 bg-gradient-to-t from-black/55 via-black/15 to-transparent p-3 text-xs font-medium text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                            Quick look →
                          </span>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between gap-3">
                          <h3 className="text-sm font-medium text-stone-900 group-hover:text-amber-950">{displayName}</h3>
                          <p className="shrink-0 text-sm font-semibold text-amber-950">
                            {formatWearMoney(p.priceCents, p.currency)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ── 5. Category split tiles ────────────────────── */}
        <section className="bg-[#ede8df] py-14 sm:py-20" aria-labelledby="categories">
          <div className={ui.pageContainer}>
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">Pick your style</p>
            <h2 id="categories" className="mt-2 text-center font-serif text-3xl text-amber-950 sm:text-4xl">
              Two essentials. Endless designs.
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-8">
              {[
                {
                  href: "/wear/shop?category=tops",
                  label: "T-shirts",
                  count: totalTees,
                  blurb: "Soft cotton. Made for everyday.",
                  src: tees[0]
                    ? wearImageUrlsFromJson(tees[0].images)[0]
                    : WEAR_VISUAL_IMAGES.primary,
                  alt: tees[0]?.name ?? "T-shirts",
                },
                {
                  href: "/wear/shop?category=hoodies",
                  label: "Hoodies",
                  count: totalHoodies,
                  blurb: "Heavyweight layers, all year round.",
                  src: hoodies[0]
                    ? wearImageUrlsFromJson(hoodies[0].images)[0]
                    : WEAR_VISUAL_IMAGES.secondary,
                  alt: hoodies[0]?.name ?? "Hoodies",
                },
              ].map((tile) => (
                <Link
                  key={tile.label}
                  href={tile.href}
                  className="group relative block overflow-hidden rounded-3xl border border-amber-950/10 bg-stone-100 shadow-[0_18px_50px_-30px_rgba(28,25,23,0.4)]"
                >
                  <div className="relative aspect-[4/3]">
                    {tile.src ? (
                      <Image
                        src={wearListingImageSrc(tile.src, 1000)}
                        alt={tile.alt}
                        fill
                        className="object-cover transition duration-700 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 92vw, 45vw"
                        quality={70}
                        unoptimized
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-6">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100/90">
                          {tile.count} pieces
                        </p>
                        <p className="mt-1 font-serif text-3xl sm:text-4xl">{tile.label}</p>
                        <p className="mt-1 text-xs text-white/85 sm:text-sm">{tile.blurb}</p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur transition group-hover:bg-white group-hover:text-amber-950">
                        Shop {tile.label}
                        <span aria-hidden>→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-12 sm:py-16" aria-labelledby="shop-next">
          <div className={`${ui.pageContainer} text-center`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">Shop first</p>
            <h2 id="shop-next" className="mt-2 font-serif text-3xl text-amber-950 sm:text-4xl">
              Choose the piece. Pick color and size. Checkout securely.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
              Printed on demand, ships in 2–5 business days, with 30-day returns on unworn apparel.
            </p>
            <Link
              href="/wear/shop"
              className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-amber-950 px-8 text-sm font-semibold text-white transition hover:bg-amber-900"
            >
              Shop T-shirts & hoodies
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        {/* ── 6. Affiliate band ──────────────────────────── */}
        <section className="relative overflow-hidden border-y border-amber-950/15 bg-[#1a1816] py-16 text-white sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-32 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-amber-700/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 bottom-0 h-[320px] w-[320px] rounded-full bg-amber-300/10 blur-3xl"
          />
          <div className={`${ui.pageContainer} relative`}>
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                  Affiliate program
                </p>
                <h2 className="mt-2 font-serif text-3xl text-white sm:text-4xl lg:text-5xl">
                  Earn by sharing the culture.
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
                  Drop your link, post your favorite tee, and get paid on every sale. We handle production,
                  shipping, and customer support — you keep the audience.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/wear/partner"
                    className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-amber-950 transition hover:bg-amber-50"
                  >
                    Become an Affiliate
                    <span aria-hidden>→</span>
                  </Link>
                  <Link
                    href="/wear/shop"
                    className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 px-7 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Browse the shop
                  </Link>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-left sm:grid-cols-2 sm:gap-6">
                {[
                  { k: "10%", v: "commission on every sale" },
                  { k: "30 days", v: "tracking cookie window" },
                  { k: "€50", v: "automatic Stripe payouts" },
                  { k: "€0", v: "to start — no inventory risk" },
                ].map((item) => (
                  <div
                    key={item.k}
                    className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur"
                  >
                    <dt className="font-serif text-3xl text-white sm:text-4xl">{item.k}</dt>
                    <dd className="mt-1 text-xs leading-relaxed text-white/80 sm:text-sm">{item.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ── 9. FAQ ─────────────────────────────────────── */}
        <section className="bg-[#f7f2ec] py-14 sm:py-20" aria-labelledby="faq">
          <div className={`${ui.pageContainer} mx-auto max-w-3xl`}>
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">FAQ</p>
            <h2 id="faq" className="mt-2 text-center font-serif text-3xl text-amber-950 sm:text-4xl">
              Things people ask before buying.
            </h2>
            <div className="mt-10 space-y-3">
              {[
                {
                  q: "When does my order ship?",
                  a: "Every piece is printed on demand and ships in 2–5 business days from our EU production partner. You get tracking the moment it leaves the print floor.",
                },
                {
                  q: "Do you ship internationally?",
                  a: "Yes. We ship across the EU, UK, US and most of the world. Final shipping cost and ETA are calculated at checkout based on your address.",
                },
                {
                  q: "How does the return policy work?",
                  a: "You have 30 days to request a return for unworn pieces. We will guide you through the return label process — and refund within 5 business days of receiving the item.",
                },
                {
                  q: "How does the affiliate program pay out?",
                  a: "10% commission on the final paid amount of every qualifying sale, calculated after any active discount. Cookies last 30 days. Payouts transfer through Stripe once unpaid commission reaches €50.",
                },
                {
                  q: "Is checkout secure?",
                  a: "Yes. Payments are processed by Stripe — we never see your card details. Apple Pay, Google Pay, and Link are supported on the checkout page.",
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-amber-950/15 bg-white px-5 py-4 text-stone-800 shadow-sm transition open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-amber-950">
                    {item.q}
                    <span
                      aria-hidden
                      className="text-lg leading-none text-amber-700 transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10. Final CTA ─────────────────────────────── */}
        <section className="relative overflow-hidden border-t border-amber-950/10 bg-amber-950 py-16 text-amber-50 sm:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
          />
          <div className={`${ui.pageContainer} relative mx-auto max-w-3xl text-center`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">Ready when you are</p>
            <h2 className="mt-2 font-serif text-4xl text-white sm:text-5xl">
              Pick your tee. Print it. Wear it tomorrow.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-amber-50/85 sm:text-base">
              No warehouse. No overstock. No middlemen. Just apparel for makers, printed when you click buy.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/wear/shop"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-8 text-sm font-semibold text-amber-950 transition hover:bg-amber-50"
              >
                Shop the drop
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/wear/partner"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 px-8 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Become an Affiliate
              </Link>
            </div>
            <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-amber-200/70">
              Free EU shipping over €50 · 30-day returns · Worldwide
            </p>
          </div>
        </section>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </MarketingLayout>
  );
}

function LegacyStudioHome() {
  const jsonLd = toJsonLdScript([websiteJsonLd(), organizationJsonLd()]);
  return (
    <MarketingLayout>
      <HomeScrollReset />
      <main className="bg-[#f7f2ec] text-stone-900">
        <section className={`${ui.pageContainer} py-12 sm:py-20`}>
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">PotteryMania</p>
            <h1 className="mt-4 font-serif text-3xl leading-snug tracking-tight text-amber-950 sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
              Clothes for people who build things with their hands.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-stone-600 sm:text-lg">
              Small runs. No warehouse. Each piece is printed when you order — for you, not for a shelf.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
              <Link
                href="/wear/shop"
                className="inline-flex min-h-12 items-center justify-center border border-amber-300/60 bg-white px-8 text-sm font-medium tracking-wide text-stone-900 shadow-[var(--pm-shadow-rest)] transition hover:bg-amber-50/90"
              >
                Shop the drop
              </Link>
              <Link
                href="/wear"
                className="inline-flex min-h-11 items-center justify-center border border-stone-300/80 bg-transparent px-6 text-sm font-medium tracking-wide text-stone-800 transition hover:border-amber-400/80 hover:bg-white/60"
              >
                Explore the drop
              </Link>
              <Link
                href="/wear/partner"
                className="text-sm font-medium text-stone-600 underline decoration-stone-400/60 underline-offset-4 transition hover:text-amber-950 hover:decoration-amber-700/60 sm:ml-1"
              >
                Partner program
              </Link>
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

        <section className="border-t border-stone-200/80 bg-[#ede8df] py-10 sm:py-14">
          <div className={ui.pageContainer}>
            <div className="mx-auto max-w-3xl">
              <div className="rounded-[var(--radius-card)] border border-stone-700/40 bg-[#1a1816] p-[var(--pm-space-6)] text-white shadow-[var(--pm-shadow-lift)] sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Studios & makers</p>
                <h2 className="mt-2 font-serif text-2xl leading-tight text-white sm:text-3xl">
                  The studio platform is still here — now alongside the shop.
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  Register for early access if you run a studio or teach: profile, discovery, bookings, and commerce tools.
                  Buying merch doesn&apos;t require an account.
                </p>

                <div className="mt-6">
                  <HomeLaunchStats />
                </div>

                <div id="register-studio" className="mt-6 border-t border-white/15 pt-6">
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Early access registration
                  </div>
                  <PrivateGuideForm />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </MarketingLayout>
  );
}

/**
 * Homepage — always apparel.
 *
 * The legacy SaaS / early-access landing (`LegacyStudioHome`) is preserved in
 * this file as dead-but-intact infrastructure for a future re-launch, but is
 * intentionally NOT reachable from `/`. We learned the hard way that
 * `NEXT_PUBLIC_*` env-flag gating is fragile across Railway builds — flags can
 * silently flip back to legacy on a stale build. The only way the storefront
 * can never accidentally show "Studios & Makers / Early access" again is to
 * remove the env-gated branch from the route entrypoint. To re-enable, wire
 * `LegacyStudioHome` to a fresh route or flip this back deliberately.
 */
// `LegacyStudioHome` reference kept so the symbol is not tree-shaken into a
// "declared but unused" error. Do not delete without also removing the
// component above.
const _legacyStudioHomeReserved = LegacyStudioHome;

export default function Home() {
  void _legacyStudioHomeReserved;
  return <ApparelHome />;
}
