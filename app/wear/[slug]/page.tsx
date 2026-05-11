import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import {
  resolveWearCatalogCategory,
  wearTopSubcategoryLabel,
} from "@/lib/wear-categories";
import { sortWearCatalogImagesForDisplay, wearImagesFromJson, wearImageUrlsFromJson } from "@/lib/wear-product-json";
import { WearProductGallery } from "@/components/wear/wear-product-gallery";
import { breadcrumbJsonLd, productJsonLd, toJsonLdScript } from "@/lib/structured-data";
import { wearPublicProductWhere } from "@/lib/wear-public-filter";
import { resolveWearGlobalPricing, wearPublicRetailUnitCents } from "@/lib/wear-commission";
import {
  mapWearProductRowToInternalPricesWithConfig,
  resolveWearInternalPricingConfig,
  shouldUseInternalWearPricing,
} from "@/lib/wear-internal-pricing";
import { wearListingImageSrc } from "@/lib/wear-listing-image";
import { formatWearMoney } from "@/lib/wear-money";
import { wearDisplayName } from "@/lib/wear-display-name";
import { WEAR_LISTING_COLOR_BADGE_SURFACE, wearListingExtraColorsLabel } from "@/lib/wear-listing-color-badge";
import { merchantFeedOfferId } from "@/lib/meta-wear-feed";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  /** Used to round-trip `?popular=…&new=…` filter flags back to the shop on "Back" / "Browse all". */
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  /**
   * Defensive: a thrown error in `generateMetadata` will render `app/wear/error.tsx`
   * for the whole route ("We couldn't load this page"). PDPs must never go down because
   * of OG/structured-data quirks — fall through to the minimal title-only metadata if
   * anything misbehaves and let the page itself render normally.
   */
  try {
    const pRaw = await prisma.wearProduct.findFirst({
      where: { ...wearPublicProductWhere(), slug },
      select: {
        name: true,
        subtitle: true,
        description: true,
        images: true,
        priceCents: true,
        currency: true,
        supplyCostCents: true,
        externalFulfillmentId: true,
        spreadconnectArticleId: true,
        spreadconnectProductTypeName: true,
        spreadconnectCategoryData: true,
        slug: true,
        variants: { where: { isActive: true }, select: { stockQuantity: true, priceCents: true } },
      },
    });
    if (!pRaw) {
      return buildMetadata({
        title: "Wear",
        description: "This piece isn’t available anymore.",
        path: `/wear/${slug}`,
      });
    }
    const internalPricingConfig = await resolveWearInternalPricingConfig();
    const globalPricing = await resolveWearGlobalPricing();
    const useInternal = shouldUseInternalWearPricing();
    const pMeta = mapWearProductRowToInternalPricesWithConfig(pRaw, internalPricingConfig);
    const retailUnit = (c: number) => wearPublicRetailUnitCents(c, globalPricing.defaultMarginBps, useInternal);
    const displayName = wearDisplayName(pMeta);
    const desc = pMeta.subtitle ?? pMeta.description ?? displayName;
    const heroImage = wearImageUrlsFromJson(pMeta.images)[0];
    const inStockVariant = pMeta.variants.find((v) => (v.stockQuantity ?? 0) > 0);
    const resolvedCents = retailUnit(inStockVariant?.priceCents ?? pMeta.priceCents ?? 0);
    const inStock = pRaw.variants.some((v) => (v.stockQuantity ?? 0) > 0);
    const currencyCode = (pRaw.currency || "EUR").toUpperCase();
    /**
     * Only emit FB product / Pinterest Rich Pin meta tags when we have a real positive
     * price. Surfacing `0.00` would tell crawlers the item is free.
     */
    const productMeta: Record<string, string> = resolvedCents > 0
      ? {
          "product:price:amount": (resolvedCents / 100).toFixed(2),
          "product:price:currency": currencyCode,
          "product:availability": inStock ? "instock" : "oos",
          "product:condition": "new",
          "product:brand": "PotteryMania",
          "og:price:amount": (resolvedCents / 100).toFixed(2),
          "og:price:currency": currencyCode,
        }
      : {};
    return buildMetadata({
      title: `${displayName} — Shop`,
      description: desc.slice(0, 160),
      path: `/wear/${slug}`,
      image: heroImage,
      imageAlt: `${displayName} — PotteryMania apparel`,
      ogType: "product",
      other: productMeta,
    });
  } catch {
    return buildMetadata({
      title: "Wear",
      description: "Apparel for makers — made with heat.",
      path: `/wear/${slug}`,
    });
  }
}

export default async function WearProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const cameFromPopular = sp.popular === "1";
  const cameFromNew = sp.new === "1";
  const pRaw = await prisma.wearProduct.findFirst({
    where: { ...wearPublicProductWhere(), slug },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      },
    },
  });
  if (!pRaw) notFound();
  const internalPricingConfig = await resolveWearInternalPricingConfig();
  const globalPricing = await resolveWearGlobalPricing();
  const useInternal = shouldUseInternalWearPricing();
  const retailUnit = (c: number) => wearPublicRetailUnitCents(c, globalPricing.defaultMarginBps, useInternal);
  const pInternal = mapWearProductRowToInternalPricesWithConfig(pRaw, internalPricingConfig);
  const p = {
    ...pInternal,
    priceCents: retailUnit(pInternal.priceCents),
    variants: pInternal.variants.map((v) => ({
      ...v,
      priceCents: retailUnit(v.priceCents ?? pInternal.priceCents),
    })),
  };
  const displayName = wearDisplayName(p);
  const category = resolveWearCatalogCategory({
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    spreadconnectProductTypeName: p.spreadconnectProductTypeName,
    spreadconnectCategoryData: p.spreadconnectCategoryData,
  });
  const images = sortWearCatalogImagesForDisplay(wearImagesFromJson(p.images)).map((image, index) => ({
    id: String(image.imageId ?? `${index}-${image.url}`),
    url: image.url,
    appearanceName: image.appearanceName,
    perspective: image.perspective,
  }));

  const variantProps = p.variants.map((v) => ({
    id: v.id,
    label: v.label,
    priceCents: v.priceCents,
    stockQuantity: v.stockQuantity,
    metaContentId: merchantFeedOfferId(p.id, v.id),
  }));
  const inStockVariant = p.variants.find((variant) => (variant.stockQuantity ?? 0) > 0);
  const jsonLd = toJsonLdScript([
    productJsonLd({
      path: `/wear/${p.slug}`,
      name: displayName,
      description: p.subtitle ?? p.description ?? `${displayName} — wear.`,
      imageUrls: images.map((image) => image.url),
      brandName: "PotteryMania",
      category: category.categoryLabel,
      price: (inStockVariant?.priceCents ?? p.priceCents) / 100,
      currency: p.currency,
      availability: p.variants.some((variant) => (variant.stockQuantity ?? 0) > 0) ? "InStock" : "OutOfStock",
    }),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Shop", path: "/wear/shop" },
      { name: displayName, path: `/wear/${p.slug}` },
    ]),
  ]);

  const relatedRaw = await prisma.wearProduct.findMany({
    where: {
      ...wearPublicProductWhere(),
      slug: { not: slug },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 12,
    include: {
      variants: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      },
    },
  });
  const relatedNormalized = relatedRaw.map((row) => {
    const m = mapWearProductRowToInternalPricesWithConfig(row, internalPricingConfig);
    const u = retailUnit(m.priceCents);
    return {
      ...m,
      priceCents: u,
      variants: m.variants.map((v) => ({ ...v, priceCents: u })),
    };
  });
  const sameCategory = relatedNormalized.filter((row) => {
    const c = resolveWearCatalogCategory({
      slug: row.slug,
      name: row.name,
      subtitle: row.subtitle,
      description: row.description,
      spreadconnectProductTypeName: row.spreadconnectProductTypeName,
      spreadconnectCategoryData: row.spreadconnectCategoryData,
    });
    return c.fallbackCategory === category.fallbackCategory;
  });
  const related = (sameCategory.length >= 4 ? sameCategory : relatedNormalized).slice(0, 4);

  /**
   * Build a back link that matches what the shop page actually filters on (`fallbackCategory` +
   * tops `topSub`) and preserves the original `?popular=1` / `?new=1` flags so the user lands on
   * the same view they came from.
   */
  const backHref = (() => {
    const params = new URLSearchParams();
    if (category.fallbackCategory) params.set("category", category.fallbackCategory);
    if (category.fallbackCategory === "tops" && category.topSub) params.set("sub", category.topSub);
    if (cameFromPopular) params.set("popular", "1");
    if (cameFromNew) params.set("new", "1");
    const qs = params.toString();
    return qs ? `/wear/shop?${qs}` : "/wear/shop";
  })();
  /** "Browse all →" inside the related products section — same axes as backHref so the user lands in the right aisle. */
  const browseAllHref = backHref;

  return (
    <main className="pm-brand bg-[var(--clay)] px-3 py-5 pb-32 text-[var(--ink)] sm:px-6 sm:py-16 sm:pb-32 md:pb-16 lg:pb-16">
      <div className="mx-auto max-w-6xl rounded-2xl border border-[var(--ink)]/10 bg-white p-3 shadow-[0_22px_80px_-32px_rgba(11,11,11,0.14)] sm:rounded-3xl sm:p-7 lg:p-8">
        <WearProductGallery
          productId={p.id}
          productName={displayName}
          images={images}
          variants={variantProps}
          basePriceCents={p.priceCents}
          currency={p.currency}
          metaContentId={merchantFeedOfferId(p.id)}
          backHref={backHref}
          categoryLabel={category.categoryLabel}
          topSubLabel={category.topSub ? wearTopSubcategoryLabel(category.topSub) : null}
          subtitle={p.subtitle}
          description={p.description}
        />
      </div>

      {related.length > 0 ? (
        <section className="mx-auto mt-12 max-w-6xl" aria-labelledby="related-products">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">More to wear</p>
              <h2 id="related-products" className="mt-1 font-serif text-2xl text-amber-950 sm:text-3xl">
                You might also like
              </h2>
            </div>
            <Link
              href={browseAllHref}
              scroll={false}
              className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-semibold text-amber-900 underline-offset-4 hover:bg-amber-50 hover:underline"
            >
              Browse all →
            </Link>
          </div>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((rp) => {
              const imgs = wearImageUrlsFromJson(rp.images);
              const src = imgs[0];
              const relatedName = wearDisplayName(rp);
              const relatedColors = wearListingExtraColorsLabel(rp.variants);
              return (
                <li key={rp.id}>
                  <Link href={`/wear/${rp.slug}`} className="group block">
                    <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200">
                      {src ? (
                        <Image
                          src={wearListingImageSrc(src, 560)}
                          alt={relatedName}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width: 640px) 92vw, 25vw"
                          quality={68}
                          loading="lazy"
                          decoding="async"
                          unoptimized
                        />
                      ) : null}
                      {relatedColors ? (
                        <span className={`${WEAR_LISTING_COLOR_BADGE_SURFACE} absolute right-2 top-2`}>
                          {relatedColors}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-3">
                      <h3 className="text-sm font-medium text-stone-900 group-hover:text-amber-950">{relatedName}</h3>
                      <p className="shrink-0 text-sm font-semibold text-amber-950">{formatWearMoney(rp.priceCents, rp.currency)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </main>
  );
}
