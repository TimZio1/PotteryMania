import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { WearShopRetryButton } from "@/components/wear/wear-shop-retry-button";
import { buildMetadata } from "@/lib/seo";
import { formatWearMoney } from "@/lib/wear-money";
import {
  WEAR_TOP_SUBCATEGORIES,
  type WearTopSubcategory,
  isWearTopSubcategory,
  resolveWearCatalogCategory,
  wearTopSubcategoryLabel,
} from "@/lib/wear-categories";
import { wearListingImageSrc } from "@/lib/wear-listing-image";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";
import { findWearPublicProductsWithVariantsRetrying, type WearPublicListingRow } from "@/lib/wear-public-catalog-query";
import { resolveWearResellerApplicationHref } from "@/lib/wear-reseller-application";

/** DB (Prisma) is not available during static export / build-time prerender. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Shop — the drop",
  description: "Limited apparel — printed on demand. Shipping calculated at checkout.",
  path: "/wear/shop",
});

type WearShopProps = {
  searchParams: Promise<{ category?: string; sub?: string }>;
};

type WearShopProduct = WearPublicListingRow & {
  categorySlug: string;
  categoryLabel: string;
  fallbackCategory: string;
  categorySource: "spreadconnect" | "fallback";
  topSub: WearTopSubcategory | null;
  providerCategoryLabel: string | null;
};

const CATEGORY_DISPLAY_ORDER = ["tops", "hoodies", "headwear", "accessories", "other"] as const;

/** Hide category chips when the catalog is a small drop (less friction). */
const WEAR_SMALL_CATALOG_MAX = 8;

export default async function WearShopPage({ searchParams }: WearShopProps) {
  const partnerHref = resolveWearResellerApplicationHref();
  const sp = await searchParams;
  const activeCategory = sp.category?.trim().toLowerCase() || null;
  const activeTopSub = isWearTopSubcategory(sp.sub) ? sp.sub : null;

  const catalogResult = await findWearPublicProductsWithVariantsRetrying();
  const dbUnavailable = !catalogResult.ok;
  const products: WearPublicListingRow[] = catalogResult.ok ? catalogResult.rows : [];

  const catInput = (p: (typeof products)[number]) => ({
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    spreadconnectProductTypeName: p.spreadconnectProductTypeName,
    spreadconnectCategoryData: p.spreadconnectCategoryData,
  });

  const normalized: WearShopProduct[] = products.map((p) => {
    const category = resolveWearCatalogCategory(catInput(p));
    return {
      ...p,
      categorySlug: category.fallbackCategory,
      categoryLabel:
        category.fallbackCategory === "tops" && category.topSub
          ? "Tops"
          : category.fallbackCategory === "hoodies"
            ? "Hoodies & Sweatshirts"
            : category.fallbackCategory === "headwear"
              ? "Headwear"
              : category.fallbackCategory === "accessories"
                ? "Accessories"
                : "Other",
      fallbackCategory: category.fallbackCategory,
      categorySource: category.source,
      topSub: category.topSub,
      providerCategoryLabel: category.providerCategory?.label ?? null,
    };
  });

  let visible: WearShopProduct[] = activeCategory
    ? normalized.filter((p) => p.categorySlug === activeCategory)
    : normalized;
  if (activeTopSub) {
    visible = visible.filter((p) => p.topSub === activeTopSub);
  }

  const topsSubsInCatalog = new Set(
    normalized
      .filter(
        (p): p is WearShopProduct & { topSub: WearTopSubcategory } =>
          p.fallbackCategory === "tops" && p.topSub != null,
      )
      .map((p) => p.topSub),
  );
  const topSubNavItems = WEAR_TOP_SUBCATEGORIES.filter((s) => topsSubsInCatalog.has(s));
  const hasTopsInCatalog = topsSubsInCatalog.size > 0;

  const categoryNavItems = Array.from(
    new Map(normalized.map((product) => [product.categorySlug, product.categoryLabel])).entries(),
  ).map(([slug, label]) => ({ slug, label }));
  categoryNavItems.sort((a, b) => {
    const aIndex = CATEGORY_DISPLAY_ORDER.indexOf(a.slug as (typeof CATEGORY_DISPLAY_ORDER)[number]);
    const bIndex = CATEGORY_DISPLAY_ORDER.indexOf(b.slug as (typeof CATEGORY_DISPLAY_ORDER)[number]);
    const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return safeA - safeB || a.label.localeCompare(b.label);
  });
  const secondaryCategoryNavItems = hasTopsInCatalog
    ? categoryNavItems.filter((category) => category.slug !== "tops")
    : categoryNavItems;

  const hideCategoryNav =
    normalized.length > 0 && normalized.length <= WEAR_SMALL_CATALOG_MAX && !activeCategory && !activeTopSub;

  type ShopBlock =
    | {
        kind: "category";
        categorySlug: string;
        heading: string;
        fallbackCategory: string;
        subsections: { sub: WearTopSubcategory; label: string; products: WearShopProduct[] }[];
      }
    | {
        kind: "simple";
        categorySlug: string;
        heading: string;
        products: WearShopProduct[];
      };

  const blocks: ShopBlock[] = [];
  for (const categoryItem of categoryNavItems) {
    const inCat = visible.filter((p) => p.categorySlug === categoryItem.slug);
    if (!inCat.length) continue;
    if (inCat.some((p) => p.fallbackCategory === "tops") && inCat.every((p) => p.fallbackCategory === "tops")) {
      const subsections =
        activeTopSub != null
          ? [{ sub: activeTopSub, label: wearTopSubcategoryLabel(activeTopSub), products: inCat }]
          : WEAR_TOP_SUBCATEGORIES.map((sub) => ({
              sub,
              label: wearTopSubcategoryLabel(sub),
              products: inCat.filter((p) => p.topSub === sub),
            })).filter((s) => s.products.length > 0);
      if (subsections.length) {
        blocks.push({
          kind: "category",
          categorySlug: categoryItem.slug,
          heading: categoryItem.label,
          fallbackCategory: "tops",
          subsections,
        });
      }
    } else {
      blocks.push({ kind: "simple", categorySlug: categoryItem.slug, heading: categoryItem.label, products: inCat });
    }
  }

  return (
    <main className="min-h-[60vh] bg-[#f7f2ec] px-4 py-10 text-stone-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-stone-600">Shop</p>
        <h1 className="mt-3 text-center font-serif text-3xl text-amber-950 sm:text-4xl">The drop</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-stone-700">
          Limited pieces. Printed and shipped after you order.
        </p>
        {!hideCategoryNav && hasTopsInCatalog ? (
          <div className="mx-auto mt-5 max-w-4xl">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center gap-2 pb-1">
                <Link
                  href="/wear/shop?category=tops"
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                    activeCategory === "tops" && activeTopSub == null
                      ? "border-amber-500 bg-amber-200/90 text-amber-950 shadow-sm"
                      : "border-stone-300 bg-white text-stone-800 hover:border-amber-400/80 hover:text-amber-950"
                  }`}
                >
                  All tops
                </Link>
                {topSubNavItems.map((sub) => (
                  <Link
                    key={sub}
                    href={`/wear/shop?category=tops&sub=${sub}`}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                      activeCategory === "tops" && activeTopSub === sub
                        ? "border-amber-500 bg-amber-200/90 text-amber-950 shadow-sm"
                        : "border-stone-300 bg-white text-stone-800 hover:border-amber-400/80 hover:text-amber-950"
                    }`}
                  >
                    {wearTopSubcategoryLabel(sub)}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {!hideCategoryNav ? (
          <div className="mx-auto mt-3 max-w-4xl">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center gap-2 pb-1">
                <Link
                  href="/wear/shop"
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                    activeCategory == null
                      ? "border-amber-500 bg-amber-200/90 text-amber-950 shadow-sm"
                      : "border-stone-300 bg-white text-stone-800 hover:border-amber-400/80 hover:text-amber-950"
                  }`}
                >
                  All
                </Link>
                {secondaryCategoryNavItems.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/wear/shop?category=${category.slug}`}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                      activeCategory === category.slug
                        ? "border-amber-500 bg-amber-200/90 text-amber-950 shadow-sm"
                        : "border-stone-300 bg-white text-stone-800 hover:border-amber-400/80 hover:text-amber-950"
                    }`}
                  >
                    {category.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {visible.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md text-center">
            <p className="text-sm leading-relaxed text-stone-600">
              {dbUnavailable
                ? "We couldn’t load the wear catalog right now. Try again in a moment."
                : activeCategory
                ? activeTopSub
                  ? `Nothing in ${wearTopSubcategoryLabel(activeTopSub)} right now — check back soon.`
                  : `Nothing in this category right now — check back soon.`
                : "Between drops. New pieces land here first — check back soon."}
            </p>
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-stone-500">
              <Link href="/wear" className="text-amber-950 underline-offset-4 hover:text-amber-800 hover:underline">
                Drop home
              </Link>
              <span className="text-stone-400">·</span>
              {partnerHref.startsWith("http") ? (
                <a
                  href={partnerHref}
                  className="text-amber-950 underline-offset-4 hover:text-amber-800 hover:underline"
                  rel="noopener noreferrer"
                >
                  Partner program
                </a>
              ) : (
                <Link href={partnerHref} className="text-amber-950 underline-offset-4 hover:text-amber-800 hover:underline">
                  Partner program
                </Link>
              )}
            </p>
            {dbUnavailable ? (
              <div className="mt-2 flex justify-center">
                <WearShopRetryButton />
              </div>
            ) : null}
            {process.env.NODE_ENV === "development" ? (
              <p className="mt-8 font-mono text-[11px] text-stone-600">
                Dev: run <span className="text-stone-400">npx prisma db seed</span> or use{" "}
                <Link href="/admin/wear-products" className="text-stone-500 underline hover:text-amber-800">
                  /admin/wear-products
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 space-y-10 sm:space-y-12">
            {blocks.map((block) =>
              block.kind === "category" ? (
                <section key={block.categorySlug} aria-labelledby={`wear-cat-${block.categorySlug}`}>
                  <h2
                    id={`wear-cat-${block.categorySlug}`}
                    className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500"
                  >
                    {block.heading}
                  </h2>
                  <div className="mt-4 space-y-8 sm:space-y-10">
                    {block.subsections.map((sub) => (
                      <div key={sub.sub}>
                        <h3
                          id={`wear-tops-${sub.sub}`}
                          className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500"
                        >
                          {sub.label}
                        </h3>
                        <ul className="mt-4 grid gap-8 sm:gap-10 sm:grid-cols-2 lg:grid-cols-3">
                          {sub.products.map((p) => {
                            const imgs = wearImageUrlsFromJson(p.images);
                            const src = imgs[0];
                            return (
                              <li key={p.id}>
                                <Link href={`/wear/${p.slug}`} className="group block">
                                  <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200">
                                    {src ? (
                                      <Image
                                        src={wearListingImageSrc(src, 640)}
                                        alt={p.name}
                                        fill
                                        className="object-cover transition duration-500 group-hover:scale-[1.02]"
                                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                                        quality={68}
                                        loading="lazy"
                                        decoding="async"
                                        unoptimized
                                      />
                                    ) : (
                                      <div className="flex h-full flex-col items-center justify-center bg-stone-100 px-6 text-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                                        <span className="mt-2 text-xs text-stone-400">Photo unavailable</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <h4 className="font-medium text-stone-900">{p.name}</h4>
                                    {p.isFeatured ? (
                                      <span className="rounded-full border border-amber-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
                                        Featured
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                    {block.heading}
                                    {sub.label ? ` · ${sub.label}` : ""}
                                  </p>
                                  {p.providerCategoryLabel ? (
                                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-stone-400">
                                      {p.providerCategoryLabel}
                                    </p>
                                  ) : null}
                                  {p.subtitle ? <p className="mt-1 text-sm text-stone-500">{p.subtitle}</p> : null}
                                  <p className="mt-2 text-sm text-stone-700">
                                    {formatWearMoney(p.priceCents, p.currency)}
                                  </p>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section key={block.categorySlug} aria-labelledby={`wear-cat-${block.categorySlug}`}>
                  <h2
                    id={`wear-cat-${block.categorySlug}`}
                    className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500"
                  >
                    {block.heading}
                  </h2>
                  <ul className="mt-4 grid gap-8 sm:gap-10 sm:grid-cols-2 lg:grid-cols-3">
                    {block.products.map((p) => {
                      const imgs = wearImageUrlsFromJson(p.images);
                      const src = imgs[0];
                      return (
                        <li key={p.id}>
                          <Link href={`/wear/${p.slug}`} className="group block">
                            <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200">
                              {src ? (
                                <Image
                                  src={wearListingImageSrc(src, 640)}
                                  alt={p.name}
                                  fill
                                  className="object-cover transition duration-500 group-hover:scale-[1.02]"
                                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                                  quality={68}
                                  loading="lazy"
                                  decoding="async"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full flex-col items-center justify-center bg-stone-100 px-6 text-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                                  <span className="mt-2 text-xs text-stone-400">Photo unavailable</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <h3 className="font-medium text-stone-900">{p.name}</h3>
                              {p.isFeatured ? (
                                <span className="rounded-full border border-amber-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
                                  Featured
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                              {block.heading}
                            </p>
                            {p.providerCategoryLabel ? (
                              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-stone-400">
                                {p.providerCategoryLabel}
                              </p>
                            ) : null}
                            {p.subtitle ? <p className="mt-1 text-sm text-stone-500">{p.subtitle}</p> : null}
                            <p className="mt-2 text-sm text-stone-700">{formatWearMoney(p.priceCents, p.currency)}</p>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
