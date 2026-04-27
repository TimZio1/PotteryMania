import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { WearShopRetryButton } from "@/components/wear/wear-shop-retry-button";
import { buildMetadata } from "@/lib/seo";
import { formatWearMoney } from "@/lib/wear-money";
import {
  WEAR_TOP_SUBCATEGORIES,
  type WearTopSubcategory,
  isWearCategory,
  isWearTopSubcategory,
  resolveWearCatalogCategory,
  wearTopSubcategoryLabel,
} from "@/lib/wear-categories";
import { wearListingImageSrc } from "@/lib/wear-listing-image";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";
import { findWearPublicProductsWithVariantsRetrying, type WearPublicListingRow } from "@/lib/wear-public-catalog-query";
import { WEAR_CURRENCY_SHOP_LINE } from "@/lib/wear-currency-policy";
import { WEAR_ACTIVE_DROP, wearActiveDropEyebrow, wearDropDefaultTitle } from "@/lib/wear-drop-config";
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
  title: isApparelOnlyLaunch() ? "The drop — Shop apparel | PotteryMania" : `Shop — ${wearDropDefaultTitle()}`,
  description: isApparelOnlyLaunch()
    ? "The live PotteryMania drop — tees, hoodies, headwear. Made with heat. Prices in EUR; secure Stripe checkout."
    : `${wearActiveDropEyebrow()} — browse the live apparel catalog. Prices in EUR; shipping and taxes at checkout.`,
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

const filterChipBase =
  "inline-flex shrink-0 snap-start items-center justify-center rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]";
/** Single-line chips (e.g. Hot picks, All). */
const filterChipClass = `${filterChipBase} min-h-11 whitespace-nowrap`;
/** Category / tops pills with a second line for “from …”. */
const filterChipClassStacked = `${filterChipBase} min-h-[2.875rem] flex-col gap-0.5 whitespace-normal py-2.5`;
const filterChipActive =
  "border-[var(--heat)] bg-[var(--ink)] text-[var(--clay)] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]";
const filterChipIdle =
  "border-[var(--ink)]/12 bg-white/95 text-[var(--ink)] hover:border-[var(--heat)]/70 hover:text-[var(--ink)]";

const filterRowClass =
  "shop-filter-row -mx-4 overflow-x-auto px-4 [scrollbar-width:thin] sm:mx-0 sm:px-0";

/**
 * Marketing/legacy URL slugs that should be reinterpreted as a known wear category.
 * Keeps shareable links working when ad campaigns use synonyms (`/wear/shop?category=t-shirts`,
 * `/wear/shop?category=new-products&sub=organic`, etc.) instead of strict slugs.
 *
 * Filter-style slugs (e.g. `popular`, `featured`, `sale`) intentionally live in
 * `WEAR_FILTER_ALIASES` below — they mean "show all categories with a flag turned on",
 * not a category by themselves.
 */
const WEAR_CATEGORY_ALIASES: Record<string, string | null> = {
  "t-shirt": "tops",
  "t-shirts": "tops",
  tee: "tops",
  tees: "tops",
  shirts: "tops",
  hoodie: "hoodies",
  hat: "headwear",
  hats: "headwear",
  caps: "headwear",
  cap: "headwear",
  bag: "accessories",
  bags: "accessories",
  accessory: "accessories",
  "new-arrivals": null,
  "new-products": null,
  newest: null,
  all: null,
};

/** Marketing slugs that should turn on a filter flag (and clear category) when used in `?category=…`. */
const WEAR_FILTER_ALIASES: Record<string, "popular" | "new"> = {
  popular: "popular",
  featured: "popular",
  sale: "popular",
  new: "new",
};

function minWearListingPrice(products: WearShopProduct[]): { cents: number; currency: string } | null {
  if (products.length === 0) return null;
  let best = products[0]!;
  for (let i = 1; i < products.length; i++) {
    const p = products[i]!;
    if (p.priceCents < best.priceCents) best = p;
  }
  return { cents: best.priceCents, currency: best.currency };
}

function CategoryChipFromLine({
  minPrice,
  active,
}: {
  minPrice: { cents: number; currency: string } | null;
  active: boolean;
}) {
  if (!minPrice) return null;
  return (
    <span
      className={`text-[9px] font-medium normal-case tracking-normal tabular-nums ${
        active ? "text-[var(--clay)]/80" : "text-[var(--shadow)]"
      }`}
    >
      from {formatWearMoney(minPrice.cents, minPrice.currency)}
    </span>
  );
}

export default async function WearShopPage({ searchParams }: WearShopProps) {
  const partnerHref = resolveWearResellerApplicationHref();
  const sp = await searchParams;
  const apparelOnly = isApparelOnlyLaunch();
  const rawCategoryEarly = sp.category?.trim().toLowerCase() || null;
  /** `?category=popular|featured|sale|new` is treated as a filter flag (not a category). */
  const filterAliasFlag = rawCategoryEarly && rawCategoryEarly in WEAR_FILTER_ALIASES ? WEAR_FILTER_ALIASES[rawCategoryEarly] : null;
  const popularOnly = sp.popular === "1" || filterAliasFlag === "popular";
  const newOnly = sp.new === "1" || filterAliasFlag === "new";

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

  const rawCategory = rawCategoryEarly;
  const explicitTopSub = isWearTopSubcategory(sp.sub) ? sp.sub : null;
  const aliasedCategory =
    rawCategory != null && filterAliasFlag != null
      ? null
      : rawCategory != null && rawCategory in WEAR_CATEGORY_ALIASES
        ? WEAR_CATEGORY_ALIASES[rawCategory]
        : rawCategory;
  const activeCategory = isWearCategory(aliasedCategory)
    ? aliasedCategory
    : explicitTopSub
      ? "tops"
      : null;
  const activeTopSub = activeCategory === "tops" ? explicitTopSub : null;
  const hasActiveFilter =
    activeCategory != null || activeTopSub != null || popularOnly || newOnly;

  /**
   * PDP links carry the active `popular` / `new` flag so the PDP back button can drop the user
   * back into the same filtered shop view they came from. (Category/sub already round-trip via the
   * product's own resolved category in `app/wear/[slug]/page.tsx#backHref`.)
   */
  const pdpQuerySuffix = (() => {
    const params = new URLSearchParams();
    if (popularOnly) params.set("popular", "1");
    if (newOnly) params.set("new", "1");
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  })();

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

  const allCatalogMinPrice = minWearListingPrice(normalized);
  const minPriceByCategorySlug = Object.fromEntries(
    categoryNavItems.map(({ slug }) => [
      slug,
      minWearListingPrice(normalized.filter((p) => p.categorySlug === slug)),
    ]),
  ) as Record<string, { cents: number; currency: string } | null>;
  const topsAllMinPrice = minWearListingPrice(normalized.filter((p) => p.categorySlug === "tops"));
  const topsSubMinPrices = Object.fromEntries(
    topSubNavItems.map((sub) => [
      sub,
      minWearListingPrice(normalized.filter((p) => p.categorySlug === "tops" && p.topSub === sub)),
    ]),
  ) as Record<WearTopSubcategory, { cents: number; currency: string } | null>;

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

  /** Mark the very first visible product image as LCP-priority for fast first paint on mobile. */
  const lcpProductId =
    blocks.length === 0
      ? null
      : blocks[0]!.kind === "category"
        ? blocks[0]!.subsections[0]?.products[0]?.id ?? null
        : blocks[0]!.products[0]?.id ?? null;

  return (
    <main className="pm-brand min-h-[60vh] bg-[var(--clay)] px-4 py-10 text-[var(--ink)] sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <p className="pm-caption text-center text-[var(--heat)]">Made with heat</p>
        <h1 className="pm-display mt-4 text-center text-[2.75rem] leading-[0.98] sm:text-[4rem] lg:text-[4.75rem]">
          The <span className="text-[var(--heat)]">drop.</span>
        </h1>
        <p className="pm-caption mx-auto mt-4 max-w-xl text-center text-[var(--shadow)]">
          {wearActiveDropEyebrow()}
          <span aria-hidden className="mx-2 text-[var(--ink)]/25">
            ·
          </span>
          {WEAR_ACTIVE_DROP.launchWindowLabel}
        </p>
        <p className="mx-auto mt-5 max-w-xl text-center text-base font-medium leading-snug text-[var(--shadow)] sm:text-lg">
          {apparelOnly
            ? "Not a mall aisle — if it\u2019s on the wall, it\u2019s in play. Scroll, filter, cop. Built different."
            : "Same voltage as the homepage — live pieces, zero filler. Find your cut and move."}
        </p>
        <p className="pm-caption mx-auto mt-3 max-w-md text-center text-[var(--shadow)]/85">
          {WEAR_CURRENCY_SHOP_LINE} Secure Stripe checkout.
        </p>
        {apparelOnly ? (
          <div className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2">
            <Link
              scroll={false}
              href={wearShopHref({
                category: activeCategory ?? undefined,
                sub: activeTopSub ?? undefined,
                popular: !popularOnly,
                new: newOnly,
              })}
              className={`${filterChipClass} ${popularOnly ? filterChipActive : filterChipIdle}`}
              aria-pressed={popularOnly}
            >
              Hot picks
            </Link>
            <Link
              scroll={false}
              href={wearShopHref({
                category: activeCategory ?? undefined,
                sub: activeTopSub ?? undefined,
                popular: popularOnly,
                new: !newOnly,
              })}
              className={`${filterChipClass} ${newOnly ? filterChipActive : filterChipIdle}`}
              aria-pressed={newOnly}
            >
              New
            </Link>
          </div>
        ) : null}
        {hasTopsInCatalog ? (
          <div className="mx-auto mt-5 max-w-4xl">
            <div className={filterRowClass}>
              <div className="flex min-w-max snap-x snap-proximity items-center gap-2 pb-2">
                <Link
                  scroll={false}
                  href="/wear/shop?category=tops"
                  className={`${filterChipClassStacked} ${activeCategory === "tops" && activeTopSub == null ? filterChipActive : filterChipIdle}`}
                  aria-pressed={activeCategory === "tops" && activeTopSub == null}
                >
                  <span className="whitespace-nowrap">All T-shirts</span>
                  <CategoryChipFromLine
                    minPrice={topsAllMinPrice}
                    active={activeCategory === "tops" && activeTopSub == null}
                  />
                </Link>
                {topSubNavItems.map((sub) => (
                  <Link
                    key={sub}
                    scroll={false}
                    href={`/wear/shop?category=tops&sub=${sub}`}
                    className={`${filterChipClassStacked} ${activeCategory === "tops" && activeTopSub === sub ? filterChipActive : filterChipIdle}`}
                    aria-pressed={activeCategory === "tops" && activeTopSub === sub}
                  >
                    <span className="whitespace-nowrap">{wearTopSubcategoryLabel(sub)}</span>
                    <CategoryChipFromLine
                      minPrice={topsSubMinPrices[sub] ?? null}
                      active={activeCategory === "tops" && activeTopSub === sub}
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <div className="mx-auto mt-3 max-w-4xl">
          <div className={filterRowClass}>
            <div className="flex min-w-max snap-x snap-proximity items-center gap-2 pb-2">
              <Link
                scroll={false}
                href="/wear/shop?category=all"
                className={`${filterChipClassStacked} ${activeCategory == null && !popularOnly && !newOnly ? filterChipActive : filterChipIdle}`}
                aria-pressed={activeCategory == null && !popularOnly && !newOnly}
              >
                <span className="whitespace-nowrap">All</span>
                <CategoryChipFromLine
                  minPrice={allCatalogMinPrice}
                  active={activeCategory == null && !popularOnly && !newOnly}
                />
              </Link>
              {secondaryCategoryNavItems.map((category) => {
                const catActive = activeCategory === category.slug;
                return (
                  <Link
                    key={category.slug}
                    scroll={false}
                    href={`/wear/shop?category=${category.slug}`}
                    className={`${filterChipClassStacked} ${catActive ? filterChipActive : filterChipIdle}`}
                    aria-pressed={catActive}
                  >
                    <span className="whitespace-nowrap">{category.label}</span>
                    <CategoryChipFromLine minPrice={minPriceByCategorySlug[category.slug] ?? null} active={catActive} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="mx-auto mt-14 max-w-md text-center">
            <p className="pm-display text-[var(--ink)] text-3xl sm:text-4xl">Nothing here yet.</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--shadow)]">
              {dbUnavailable
                ? "Couldn’t load the shop. Try again in a moment."
                : hasActiveFilter
                ? activeTopSub
                  ? `Nothing in ${wearTopSubcategoryLabel(activeTopSub)} on this drop.`
                  : popularOnly
                  ? "No hot picks in this view."
                  : newOnly
                  ? "No new arrivals in this view."
                  : "Empty in this category."
                : "Next drop loading."}
            </p>
            {!dbUnavailable ? (
              <div className="mt-7 flex justify-center">
                <Link
                  scroll={false}
                  href="/wear/shop?category=all"
                  className="pm-btn pm-btn--heat inline-flex min-h-12 items-center justify-center px-7 text-sm font-semibold uppercase tracking-[0.14em]"
                >
                  {hasActiveFilter ? "See the full drop →" : "See the full drop →"}
                </Link>
              </div>
            ) : null}
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-stone-500">
              <Link
                href={apparelOnly ? "/" : "/wear"}
                className="min-h-11 px-1 py-2 text-amber-950 underline-offset-4 hover:text-amber-800 hover:underline"
              >
                {apparelOnly ? "Back to home" : "Drop home"}
              </Link>
              <span className="text-stone-400" aria-hidden>·</span>
              {partnerHref.startsWith("http") ? (
                <a
                  href={partnerHref}
                  className="min-h-11 px-1 py-2 text-amber-950 underline-offset-4 hover:text-amber-800 hover:underline"
                  rel="noopener noreferrer"
                >
                  {apparelOnly ? "Affiliate program" : "Partner program"}
                </a>
              ) : (
                <Link
                  href={partnerHref}
                  className="min-h-11 px-1 py-2 text-amber-950 underline-offset-4 hover:text-amber-800 hover:underline"
                >
                  {apparelOnly ? "Affiliate program" : "Partner program"}
                </Link>
              )}
            </p>
            {dbUnavailable ? (
              <div className="mt-4 flex justify-center">
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
                    className="border-b border-[var(--ink)]/10 pb-3 font-serif text-2xl text-[var(--ink)] sm:text-3xl"
                  >
                    {block.heading}
                  </h2>
                  <div className="mt-4 space-y-8 sm:space-y-10">
                    {block.subsections.map((sub) => (
                      <div key={sub.sub}>
                        <h3
                          id={`wear-tops-${sub.sub}`}
                          className="pm-caption text-[var(--heat)]"
                        >
                          {sub.label}
                        </h3>
                        <ul className="mt-4 grid gap-8 sm:gap-10 sm:grid-cols-2 lg:grid-cols-3">
                          {sub.products.map((p) => {
                            const imgs = wearImageUrlsFromJson(p.images);
                            const src = imgs[0];
                            const displayName = wearDisplayName(p);
                            const isLcp = p.id === lcpProductId;
                            return (
                              <li key={p.id}>
                                <Link href={`/wear/${p.slug}${pdpQuerySuffix}`} className="group block">
                                  <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-[var(--ink)]/5 ring-1 ring-[var(--ink)]/10 transition duration-300 group-hover:ring-[var(--heat)]/50">
                                    {src ? (
                                      <Image
                                        src={wearListingImageSrc(src, 640)}
                                        alt={displayName}
                                        fill
                                        className="object-cover transition duration-500 group-hover:scale-[1.02]"
                                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                                        quality={68}
                                        loading={isLcp ? "eager" : "lazy"}
                                        priority={isLcp}
                                        fetchPriority={isLcp ? "high" : "auto"}
                                        decoding="async"
                                        unoptimized
                                      />
                                    ) : (
                                      <div className="flex h-full flex-col items-center justify-center bg-[var(--ink)]/5 px-6 text-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--ink)]/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                                        <span className="mt-2 text-xs text-[var(--shadow)]">Photo unavailable</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-4 flex items-baseline justify-between gap-3">
                                    <h4 className="min-w-0 line-clamp-2 text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--heat)]">
                                      {displayName}
                                    </h4>
                                    <p className="shrink-0 text-sm font-bold text-[var(--heat)]">
                                      {formatWearMoney(p.priceCents, p.currency)}
                                    </p>
                                  </div>
                                  {p.isFeatured ? (
                                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--heat)]">Drop pick</p>
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
                    className="border-b border-[var(--ink)]/10 pb-3 font-serif text-2xl text-[var(--ink)] sm:text-3xl"
                  >
                    {block.heading}
                  </h2>
                  <ul className="mt-4 grid gap-8 sm:gap-10 sm:grid-cols-2 lg:grid-cols-3">
                    {block.products.map((p) => {
                      const imgs = wearImageUrlsFromJson(p.images);
                      const src = imgs[0];
                      const displayName = wearDisplayName(p);
                      const isLcp = p.id === lcpProductId;
                      return (
                        <li key={p.id}>
                          <Link href={`/wear/${p.slug}${pdpQuerySuffix}`} className="group block">
                            <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-[var(--ink)]/5 ring-1 ring-[var(--ink)]/10 transition duration-300 group-hover:ring-[var(--heat)]/50">
                              {src ? (
                                <Image
                                  src={wearListingImageSrc(src, 640)}
                                  alt={displayName}
                                  fill
                                  className="object-cover transition duration-500 group-hover:scale-[1.02]"
                                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                                  quality={68}
                                  loading={isLcp ? "eager" : "lazy"}
                                  priority={isLcp}
                                  fetchPriority={isLcp ? "high" : "auto"}
                                  decoding="async"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full flex-col items-center justify-center bg-[var(--ink)]/5 px-6 text-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--ink)]/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                                  <span className="mt-2 text-xs text-[var(--shadow)]">Photo unavailable</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-4 flex items-baseline justify-between gap-3">
                              <h3 className="min-w-0 line-clamp-2 text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--heat)]">
                                {displayName}
                              </h3>
                              <p className="shrink-0 text-sm font-bold text-[var(--heat)]">{formatWearMoney(p.priceCents, p.currency)}</p>
                            </div>
                            {p.isFeatured ? (
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--heat)]">Drop pick</p>
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
