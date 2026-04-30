import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { PrivateGuideForm } from "@/app/early-access/private-guide-form";
import { HomeLaunchStats } from "@/app/home-launch-stats";
import { HomeScrollReset } from "@/app/home-scroll-reset";
import { apparelMarketingDescription, buildAbsoluteUrl, buildMetadata } from "@/lib/seo";
import {
  faqPageJsonLd,
  itemListJsonLd,
  organizationJsonLd,
  toJsonLdScript,
  webPageJsonLd,
  websiteJsonLd,
} from "@/lib/structured-data";
import { WEAR_HOME_APPAREL_FAQ } from "@/lib/wear-home-faq";
import { WEAR_VISUAL_IMAGES } from "@/lib/wear-config";
import { findWearPublicProductsWithVariantsRetrying } from "@/lib/wear-public-catalog-query";
import { wearListingImageSrc } from "@/lib/wear-listing-image";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";
import { ui } from "@/lib/ui-styles";
import {
  mapWearProductRowToInternalPricesWithConfig,
  resolveWearInternalPricingConfig,
} from "@/lib/wear-internal-pricing";
import { wearDisplayName } from "@/lib/wear-display-name";
import { resolveWearCategory } from "@/lib/wear-categories";
import { WearBuyXGetYHeroBadge, WearBuyXGetYHomePromo } from "@/components/wear/wear-buy-x-get-y-home-promo";
import { WearHomeSocialProof } from "@/components/wear/wear-home-social-proof";

export const dynamic = "force-dynamic";

const IMPACT_SITE_VERIFICATION = "886dc8c3-9975-4330-92e4-e34425f85624";

export async function generateMetadata(): Promise<Metadata> {
  const base = buildMetadata({
    title: "PotteryMania — T-Shirts & Apparel for Makers",
    description: apparelMarketingDescription(),
    path: "/",
    keywords: [
      "pottery gifts",
      "artist merch Europe",
      "independent apparel brand",
      "potter Christmas gifts",
    ],
  });
  return {
    ...base,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    other: {
      "impact-site-verification": IMPACT_SITE_VERIFICATION,
    },
  };
}

async function ApparelHome() {
  const catalog = await findWearPublicProductsWithVariantsRetrying();
  const internalPricingConfig = await resolveWearInternalPricingConfig();
  const rows = catalog.ok
    ? catalog.rows.map((row) => mapWearProductRowToInternalPricesWithConfig(row, internalPricingConfig))
    : [];
  const featured = rows.filter((p) => p.isFeatured).slice(0, 8);
  const showcase = featured.length >= 4 ? featured : rows.slice(0, 8);
  const isHoodieLike = (p: (typeof rows)[number]) =>
    /hoodie|sweat|fleece|pullover/i.test(
      `${p.name} ${p.spreadconnectProductTypeName ?? ""} ${p.subtitle ?? ""}`,
    );
  const hoodies = rows.filter(isHoodieLike);
  const tees = rows.filter((p) => !isHoodieLike(p) && resolveWearCategory({
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    spreadconnectProductTypeName: p.spreadconnectProductTypeName,
    spreadconnectCategoryData: p.spreadconnectCategoryData,
  }) !== "headwear");
  const headwear = rows.filter((p) => resolveWearCategory({
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    spreadconnectProductTypeName: p.spreadconnectProductTypeName,
    spreadconnectCategoryData: p.spreadconnectCategoryData,
  }) === "headwear");
  const heroAnchor = showcase[0] ?? rows[0];
  const totalActive = rows.length;
  const totalTees = tees.length;

  /**
   * The second campaign slab pulls whichever bucket has the most pieces after tees, so the home
   * always presents two real "drops" instead of empty placeholders. Defaults to hoodies when nothing
   * is bigger.
   */
  const secondaryDrop = (() => {
    const candidates: Array<{
      category: string;
      href: string;
      label: string;
      tagline: string;
      /** Body copy specific to the bucket — hoodies and headwear sell on different cues. */
      body: string;
      rows: typeof rows;
    }> = [
      {
        category: "hoodies",
        href: "/wear/shop?category=hoodies",
        label: "Hoodies",
        tagline: "Hold the line.",
        body: "Heavyweight, slow-burn pieces for late nights at the wheel.",
        rows: hoodies,
      },
      {
        category: "headwear",
        href: "/wear/shop?category=headwear",
        label: "Headwear",
        tagline: "Crown the work.",
        body: "Low-profile caps and beanies built to wear in, not break in.",
        rows: headwear,
      },
    ];
    return candidates
      .filter((c) => c.rows.length > 0)
      .sort((a, b) => b.rows.length - a.rows.length)[0]
      ?? candidates[0];
  })();

  /** Drop wall — up to 9 real catalog photos for the community grid. Falls back to the hero anchor. */
  const dropWall = rows
    .map((row) => {
      const imgs = wearImageUrlsFromJson(row.images);
      return imgs[0] ? { id: row.id, src: imgs[0], slug: row.slug, name: wearDisplayName(row) } : null;
    })
    .filter((row): row is { id: string; src: string; slug: string; name: string } => row !== null)
    .slice(0, 9);

  const dropNumber = (() => {
    const week = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / (1000 * 60 * 60 * 24 * 7));
    return String(Math.max(1, week % 99)).padStart(3, "0");
  })();

  const heroSrcForSchema = heroAnchor
    ? wearImageUrlsFromJson(heroAnchor.images)[0] ?? WEAR_VISUAL_IMAGES.primary
    : WEAR_VISUAL_IMAGES.primary;
  const heroImageForSchema = wearListingImageSrc(heroSrcForSchema, 1600);
  const heroImageAbsolute = /^https?:\/\//i.test(heroImageForSchema)
    ? heroImageForSchema
    : buildAbsoluteUrl(heroImageForSchema.startsWith("/") ? heroImageForSchema : `/${heroImageForSchema}`);

  const jsonLd = toJsonLdScript([
    websiteJsonLd(),
    organizationJsonLd(),
    webPageJsonLd({
      name: "PotteryMania — T-Shirts & Apparel for Makers",
      description: apparelMarketingDescription(),
      path: "/",
      fragmentId: "webpage",
      primaryImageUrl: heroImageAbsolute,
      speakableCssSelectors: ["#hero-headline", "#hero-summary"],
    }),
    faqPageJsonLd(WEAR_HOME_APPAREL_FAQ),
    ...(showcase.length > 0
      ? [
          itemListJsonLd({
            name: "Featured pieces in the live apparel drop",
            path: "/",
            items: showcase.slice(0, 12).map((p) => ({
              name: wearDisplayName(p),
              path: `/wear/${p.slug}`,
            })),
          }),
        ]
      : []),
  ]);

  return (
    <MarketingLayout>
      <HomeScrollReset />
      <main className="pm-brand pm-snap relative overflow-hidden bg-[var(--clay)] text-[var(--ink)]">
        {/* ── 0. Trust strip — single line, no emoji, no clutter ─────────────── */}
        <div className="border-b border-[var(--ink)]/10 bg-[var(--ink)] text-[var(--clay)]">
          <p className="pm-caption mx-auto max-w-6xl px-4 py-2.5 text-center">
            30-day returns
            <span aria-hidden className="mx-3 text-[var(--clay)]/40">·</span>
            Worldwide shipping
            <span aria-hidden className="mx-3 text-[var(--clay)]/40">·</span>
            Free EU shipping on orders over €50
          </p>
        </div>

        {/* ── 1. Hero — one image, one headline, one CTA ─────────────────────── */}
        <section
          className="relative isolate flex min-h-[100svh] w-full items-end overflow-hidden bg-[var(--ink)]"
          aria-labelledby="hero-headline"
        >
          {(() => {
            const heroSrc = heroAnchor
              ? wearImageUrlsFromJson(heroAnchor.images)[0] ?? WEAR_VISUAL_IMAGES.primary
              : WEAR_VISUAL_IMAGES.primary;
            const heroAlt = heroAnchor ? wearDisplayName(heroAnchor) : WEAR_VISUAL_IMAGES.primaryAlt;
            return (
              <Image
                src={wearListingImageSrc(heroSrc, 2000)}
                alt={heroAlt}
                fill
                className="object-cover object-center opacity-80"
                sizes="100vw"
                quality={78}
                priority
                unoptimized
              />
            );
          })()}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/60 to-transparent"
          />
          <div className="relative mx-auto w-full max-w-7xl px-6 pb-16 pt-32 sm:px-10 sm:pb-24 sm:pt-40 lg:pb-28">
            <p className="pm-caption text-[var(--heat)]">
              Drop {dropNumber}
              <span aria-hidden className="mx-2 text-[var(--clay)]/40">·</span>
              <span className="text-[var(--clay)]/80">Live now</span>
            </p>
            <h1
              id="hero-headline"
              className="pm-display mt-6 max-w-5xl text-[var(--clay)] text-[3.25rem] sm:text-[5.5rem] lg:text-[8rem]"
            >
              Made with
              <br />
              <span className="text-[var(--heat)]">heat.</span>
            </h1>
            <p
              id="hero-summary"
              className="mt-6 max-w-md text-base text-[var(--clay)]/85 sm:text-lg"
            >
              T-shirts and hoodies for people who don&apos;t sit still.
            </p>
            <WearBuyXGetYHeroBadge className="mt-8" />
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Link href="/wear/shop" className="pm-btn pm-btn--heat group">
                Shop the drop
                <span aria-hidden className="ml-3 transition group-hover:translate-x-0.5">→</span>
              </Link>
              <p className="pm-caption text-[var(--clay)]/60">
                {totalActive} pieces · live in the drop
              </p>
            </div>
          </div>
        </section>

        <WearHomeSocialProof
          totalPieces={totalActive}
          teeCount={totalTees}
          hoodieCount={hoodies.length}
          catalogOk={catalog.ok}
        />

        {/* ── 2. Buy 4 · Get 1 — campaign slab (heat-framed, full bleed) ─────── */}
        <WearBuyXGetYHomePromo />

        {/* ── 3. Slab A — TEES (clay slab, ink type) ─────────────────────────── */}
        {totalTees > 0 ? (
          <section className="pm-slab-light grid lg:min-h-[88svh] lg:grid-cols-2" aria-labelledby="slab-tees">
            <div className="relative aspect-[4/5] overflow-hidden lg:aspect-auto">
              {(() => {
                const src = wearImageUrlsFromJson(tees[0].images)[0] ?? WEAR_VISUAL_IMAGES.primary;
                return (
                  <Image
                    src={wearListingImageSrc(src, 1600)}
                    alt={wearDisplayName(tees[0])}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    quality={75}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    unoptimized
                  />
                );
              })()}
            </div>
            <div className="flex flex-col justify-center gap-8 px-6 py-16 sm:px-12 sm:py-20 lg:px-20 lg:py-24">
              <p className="pm-caption text-[var(--shadow)]">
                01 / Tees
                <span aria-hidden className="mx-2 text-[var(--shadow)]/50">·</span>
                {totalTees} pieces
              </p>
              <h2
                id="slab-tees"
                className="pm-display text-[var(--ink)] text-[3rem] sm:text-[5rem] lg:text-[6.5rem]"
              >
                Wear
                <br />
                the work.
              </h2>
              <p className="max-w-md text-lg text-[var(--shadow)]">
                Soft cotton. Heavy ink. Built to outlast every other shirt in your drawer.
              </p>
              <div>
                <Link href="/wear/shop?category=tops" className="pm-btn group">
                  Shop tees
                  <span aria-hidden className="ml-3 transition group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── 4. Slab B — HOODIES / SECONDARY DROP (ink slab, clay type) ─────── */}
        {secondaryDrop && secondaryDrop.rows.length > 0 ? (
          <section className="pm-slab-dark grid lg:min-h-[88svh] lg:grid-cols-2" aria-labelledby="slab-secondary">
            <div className="order-2 flex flex-col justify-center gap-8 px-6 py-16 sm:px-12 sm:py-20 lg:order-1 lg:px-20 lg:py-24">
              <p className="pm-caption text-[var(--heat)]">
                02 / {secondaryDrop.label}
                <span aria-hidden className="mx-2 text-[var(--clay)]/40">·</span>
                <span className="text-[var(--clay)]/70">{secondaryDrop.rows.length} pieces</span>
              </p>
              <h2
                id="slab-secondary"
                className="pm-display text-[var(--clay)] text-[3rem] sm:text-[5rem] lg:text-[6.5rem]"
              >
                {secondaryDrop.tagline.split(" ").slice(0, -1).join(" ")}
                <br />
                <span className="text-[var(--heat)]">{secondaryDrop.tagline.split(" ").slice(-1)[0]}</span>
              </h2>
              <p className="max-w-md text-lg text-[var(--clay)]/75">
                {secondaryDrop.body}
              </p>
              <div>
                <Link href={secondaryDrop.href} className="pm-btn pm-btn--heat group">
                  Shop {secondaryDrop.label.toLowerCase()}
                  <span aria-hidden className="ml-3 transition group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </div>
            <div className="relative order-1 aspect-[4/5] overflow-hidden lg:order-2 lg:aspect-auto">
              {(() => {
                const src =
                  wearImageUrlsFromJson(secondaryDrop.rows[0].images)[0] ?? WEAR_VISUAL_IMAGES.secondary;
                return (
                  <Image
                    src={wearListingImageSrc(src, 1600)}
                    alt={wearDisplayName(secondaryDrop.rows[0])}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    quality={75}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    unoptimized
                  />
                );
              })()}
            </div>
          </section>
        ) : null}

        {/* ── 5. Manifesto — black slab, off-white type, no image ────────────── */}
        <section className="pm-slab-dark relative overflow-hidden" aria-labelledby="manifesto">
          <div className="mx-auto max-w-5xl px-6 py-24 text-center sm:px-10 sm:py-32">
            <p className="pm-caption text-[var(--heat)]">Manifesto</p>
            <h2
              id="manifesto"
              className="pm-display mt-8 text-[var(--clay)] text-[2.25rem] leading-[1.05] sm:text-[3.5rem] lg:text-[4.5rem]"
            >
              We don&apos;t sell merch.
              <br />
              We outfit the people who
              <br />
              <span className="text-[var(--heat)]">make things with heat.</span>
            </h2>
          </div>
        </section>

        {/* ── 6. Drop wall — real catalog photos, community grid ─────────────── */}
        {dropWall.length >= 6 ? (
          <section className="pm-slab-light px-0 py-16 sm:py-24" aria-labelledby="drop-wall">
            <div className="mx-auto max-w-7xl px-6 sm:px-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="pm-caption text-[var(--shadow)]">The drop wall</p>
                  <h2
                    id="drop-wall"
                    className="pm-display mt-3 text-[var(--ink)] text-[2rem] sm:text-[3rem] lg:text-[4rem]"
                  >
                    Tag <span className="text-[var(--heat)]">#madewithheat</span>
                    <br />
                    to join.
                  </h2>
                </div>
                <Link
                  href="/wear/shop"
                  className="hidden items-center gap-2 self-end pb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--ink)] hover:text-[var(--heat)] sm:inline-flex"
                >
                  See all
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
            <ul className="mt-10 grid grid-cols-3 gap-px bg-[var(--ink)]/8 sm:gap-1">
              {dropWall.map((tile) => (
                <li key={tile.id} className="relative aspect-square overflow-hidden bg-[var(--ink)]/5">
                  <Link href={`/wear/${tile.slug}`} className="group block h-full w-full">
                    <Image
                      src={wearListingImageSrc(tile.src, 700)}
                      alt={tile.name}
                      fill
                      className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                      sizes="(max-width: 768px) 33vw, 25vw"
                      quality={68}
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                      unoptimized
                    />
                    <span className="absolute inset-0 bg-[var(--ink)]/0 transition group-hover:bg-[var(--ink)]/40" />
                    <span className="pm-caption absolute inset-x-0 bottom-0 translate-y-2 px-3 py-2 text-[var(--clay)] opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                      View →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ── 7. Affiliate slab — reskinned, ink ground, single CTA ──────────── */}
        <section className="pm-slab-dark relative overflow-hidden" aria-labelledby="affiliate">
          <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
            <div className="grid items-end gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <p className="pm-caption text-[var(--heat)]">Affiliate program</p>
                <h2
                  id="affiliate"
                  className="pm-display mt-6 text-[var(--clay)] text-[2.25rem] sm:text-[3.5rem] lg:text-[4.25rem]"
                >
                  Run the drop.
                  <br />
                  Get paid.
                </h2>
                <p className="mt-6 max-w-md text-base text-[var(--clay)]/75">
                  Drop your link. We run fulfillment and support — you keep the audience.
                </p>
                <div className="mt-10">
                  <Link href="/wear/partner" className="pm-btn group">
                    Become an affiliate
                    <span aria-hidden className="ml-3 transition group-hover:translate-x-0.5">→</span>
                  </Link>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-10 lg:gap-x-12">
                {[
                  { k: "10%", v: "Commission on every sale" },
                  { k: "30d", v: "Cookie window" },
                  { k: "€50", v: "Auto Stripe payouts" },
                  { k: "€0", v: "To start" },
                ].map((item) => (
                  <div key={item.k} className="border-l-2 border-[var(--heat)] pl-5">
                    <dt className="pm-display text-[var(--clay)] text-[2.5rem] sm:text-[3.5rem]">{item.k}</dt>
                    <dd className="pm-caption mt-2 text-[var(--clay)]/70">{item.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ── 8. FAQ — kept for SEO + trust, reskinned to brand ──────────────── */}
        <section className="pm-slab-light py-20 sm:py-28" aria-labelledby="faq">
          <div className="mx-auto max-w-3xl px-6 sm:px-10">
            <p className="pm-caption text-center text-[var(--shadow)]">Before you tap buy</p>
            <h2
              id="faq"
              className="pm-display mt-4 text-center text-[var(--ink)] text-[2rem] sm:text-[3rem]"
            >
              Cold facts.
            </h2>
            <div className="mt-12 divide-y divide-[var(--ink)]/15 border-y border-[var(--ink)]/15">
              {WEAR_HOME_APPAREL_FAQ.map((item) => (
                <details key={item.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold uppercase tracking-[0.06em] text-[var(--ink)]">
                    <span>{item.question}</span>
                    <span
                      aria-hidden
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--ink)]/20 text-lg leading-none text-[var(--ink)] transition group-open:rotate-45 group-open:bg-[var(--ink)] group-open:text-[var(--clay)]"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--shadow)]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── 9. Final CTA — full-bleed black, single decision ───────────────── */}
        <section className="pm-slab-dark relative overflow-hidden" aria-labelledby="final-cta">
          <div className="mx-auto flex min-h-[80svh] max-w-5xl flex-col items-center justify-center px-6 py-24 text-center sm:px-10 sm:py-32">
            <p className="pm-caption text-[var(--heat)]">Drop {dropNumber}</p>
            <h2
              id="final-cta"
              className="pm-display mt-8 text-[var(--clay)] text-[3rem] sm:text-[5.5rem] lg:text-[7.5rem]"
            >
              Ready?
              <br />
              <span className="text-[var(--heat)]">Enter the drop.</span>
            </h2>
            <div className="mt-14">
              <Link href="/wear/shop" className="pm-btn pm-btn--heat group">
                Shop now
                <span aria-hidden className="ml-3 transition group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
            <p className="pm-caption mt-10 text-[var(--clay)]/50">
              30-day returns · Worldwide shipping · Free EU shipping on orders over €50
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
              Small runs. No filler. Each piece is for you — not for a shelf.
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
                loading="lazy"
                decoding="async"
                fetchPriority="low"
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
