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
import { WEAR_CURRENCY_SHOP_LINE } from "@/lib/wear-currency-policy";
import { WEAR_ACTIVE_DROP, wearDropDefaultTitle } from "@/lib/wear-drop-config";
import { resolveWearResellerApplicationHref } from "@/lib/wear-reseller-application";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";
import {
  mapWearProductRowToInternalPricesWithConfig,
  resolveWearInternalPricingConfig,
} from "@/lib/wear-internal-pricing";
import { wearDisplayName } from "@/lib/wear-display-name";

/** DB (Prisma) is not available during static export / build-time prerender. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: isApparelOnlyLaunch() ? "Shop T-shirts & apparel — PotteryMania" : `Shop — ${wearDropDefaultTitle()}`,
  description: isApparelOnlyLaunch()
    ? "Browse T-shirts, hoodies, and maker apparel — printed on demand. Shipping and taxes at checkout."
    : "Apparel from our print-on-demand catalog — synced from production. Prices in EUR; shipping and taxes at checkout.",
  path: "/wear/shop",
});

type WearShopProps = {
  searchParams: Promise<{ category?: string; sub?: string; popular?: string; new?: string }>;
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

const NEW_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000;

function wearShopHref(opts: {
  category?: string | null;
  sub?: WearTopSubcategory | null;
  popular?: boolean;
  new?: boolean;
}) {
  const q = new URLSearchParams();
  if (opts.category) q.set("category", opts.category);
  if (opts.sub) q.set("sub", opts.sub);
  if (opts.popular) q.set("popular", "1");
  if (opts.new) q.set("new", "1");
  const s = q.toString();
  return s ? `/wear/shop?${s}` : "/wear/shop";
}

export default async function WearShopPage({ searchParams }: WearShopProps) {
  const partnerHref = resolveWearResellerApplicationHref();
  const sp = await searchParams;
  const apparelOnly = isApparelOnlyLaunch();
  const popularOnly = sp.popular === "1";
  const newOnly = sp.new === "1";

  const catalogResult = await findWearPublicProductsWithVariantsRetrying();
  const dbUnavailable = !catalogResult.ok;
  const products: WearPublicListingRow[] = catalogResult.ok ? catalogResult.rows : [];
  const internalPricingConfig = await resolveWearInternalPricingConfig();

  const catInput = (p: (typeof products)[number]) => ({
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    spreadconnectProductTypeName: p.spreadconnectProductTypeName,
    spreadconnectCategoryData: p.spreadconnectCategoryData,
  });

  const normalized: WearShopProduct[] = products.map((raw) => {
    const p = mapWearProductRowToInternalPricesWithConfig(raw, internalPricingConfig);
    const category = resolveWearCatalogCategory(catInput(p));
    return {
      ...p,
      categorySlug: category.fallbackCategory,
      categoryLabel:
        category.fallbackCategory === "tops"
          ? "T-shirts"
          : category.fallbackCategory === "hoodies"
            ? "Hoodies"
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

  const rawCategory = sp.category?.trim().toLowerCase() || null;
  const activeCategory = rawCategory === "all" ? null : rawCategory;
  const activeTopSub = isWearTopSubcategory(sp.sub) ? sp.sub : null;

  let visible: WearShopProduct[] = activeCategory
    ? normalized.filter((p) => p.categorySlug === activeCategory)
    : normalized;
  if (activeTopSub) {
    visible = visible.filter((p) => p.topSub === activeTopSub);
  }
  if (popularOnly) {
    visible = visible.filter((p) => p.isFeatured);
  }
  if (newOnly) {
    const cutoff = Date.now() - NEW_THRESHOLD_MS;
    visible = visible.filter((p) => new Date(p.createdAt).getTime() >= cutoff);
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
        <h1 className="mt-3 text-center font-serif text-3xl text-amber-950 sm:text-4xl">
          {apparelOnly ? "T-shirts & Hoodies" : "The drop"}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-center text-xs font-medium text-stone-600">
          {apparelOnly
            ? "Printed on demand · ships in 2–5 days"
            : `${WEAR_ACTIVE_DROP.sequenceLabel} · ${WEAR_ACTIVE_DROP.theme} · ${WEAR_ACTIVE_DROP.launchWindowLabel}`}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-stone-700">
          {apparelOnly
            ? `Pick a tee or hoodie, choose your size and color, check out securely. ${WEAR_CURRENCY_SHOP_LINE}`
            : `Catalog stays in sync with production — what you see is what you can order. Each piece is printed and shipped after you check out. ${WEAR_CURRENCY_SHOP_LINE}`}
        </p>
        {apparelOnly ? (
          <div className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2">
            <Link
              href={wearShopHref({ popular: true })}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 py-2 text-xs font-medium ${
                popularOnly
                  ? "border-amber-500 bg-amber-200/90 text-amber-950 shadow-sm"
                  : "border-stone-300 bg-white text-stone-800 hover:border-amber-400/80 hover:text-amber-950"
              }`}
            >
              Popular
            </Link>
            <Link
              href={wearShopHref({ new: true })}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 py-2 text-xs font-medium ${
                newOnly
                  ? "border-amber-500 bg-amber-200/90 text-amber-950 shadow-sm"
                  : "border-stone-300 bg-white text-stone-800 hover:border-amber-400/80 hover:text-amber-950"
              }`}
            >
              New
            </Link>
          </div>
        ) : null}
        {hasTopsInCatalog ? (
          <div className="mx-auto mt-5 max-w-4xl">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center gap-2 pb-1">
                <Link
                  href="/wear/shop?category=tops"
                  className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium ${
                    activeCategory === "tops" && activeTopSub == null
                      ? "border-amber-500 bg-amber-200/90 text-amber-950 shadow-sm"
                      : "border-stone-300 bg-white text-stone-800 hover:border-amber-400/80 hover:text-amber-950"
                  }`}
                >
                  All T-shirts
                </Link>
                {topSubNavItems.map((sub) => (
                  <Link
                    key={sub}
                    href={`/wear/shop?category=tops&sub=${sub}`}
                    className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium ${
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
        <div className="mx-auto mt-3 max-w-4xl">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center gap-2 pb-1">
                <Link
                  href={apparelOnly ? "/wear/shop?category=all" : "/wear/shop"}
                  className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium ${
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
                    className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium ${
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

        {visible.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md text-center">
            <p className="text-sm leading-relaxed text-stone-600">
              {dbUnavailable
                ? "We couldn’t load the wear catalog right now. Try again in a moment."
                : activeCategory
                ? activeTopSub
                  ? `Nothing in ${wearTopSubcategoryLabel(activeTopSub)} right now — check back soon.`
                  : `Nothing in this category right now — check back soon.`
                : "Nothing is listed in the shop yet — check back after the next catalog sync."}
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
                            const displayName = wearDisplayName(p);
                            return (
                              <li key={p.id}>
                                <Link href={`/wear/${p.slug}`} className="group block">
                                  <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200">
                                    {src ? (
                                      <Image
                                        src={wearListingImageSrc(src, 640)}
                                        alt={displayName}
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
                                  <div className="mt-4 flex items-baseline justify-between gap-3">
                                    <h4 className="text-sm font-medium text-stone-900 group-hover:text-amber-950">{displayName}</h4>
                                    <p className="shrink-0 text-sm font-semibold text-amber-950">
                                      {formatWearMoney(p.priceCents, p.currency)}
                                    </p>
                                  </div>
                                  {p.isFeatured ? (
                                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">★ Featured</p>
                                  ) : null}
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
                      const displayName = wearDisplayName(p);
                      return (
                        <li key={p.id}>
                          <Link href={`/wear/${p.slug}`} className="group block">
                            <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200">
                              {src ? (
                                <Image
                                  src={wearListingImageSrc(src, 640)}
                                  alt={displayName}
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
                            <div className="mt-4 flex items-baseline justify-between gap-3">
                              <h3 className="text-sm font-medium text-stone-900 group-hover:text-amber-950">{displayName}</h3>
                              <p className="shrink-0 text-sm font-semibold text-amber-950">{formatWearMoney(p.priceCents, p.currency)}</p>
                            </div>
                            {p.isFeatured ? (
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">★ Featured</p>
                            ) : null}
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
