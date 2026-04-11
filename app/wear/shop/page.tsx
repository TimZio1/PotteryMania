import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
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

/** DB (Prisma) is not available during static export / build-time prerender. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Wear — Shop",
  description: "PotteryMania wear — shop the drop in our own storefront.",
  path: "/wear/shop",
});

type WearShopProps = {
  searchParams: Promise<{ category?: string; sub?: string }>;
};

type WearShopProduct = Awaited<ReturnType<typeof prisma.wearProduct.findMany>>[number] & {
  categorySlug: string;
  categoryLabel: string;
  fallbackCategory: string;
  categorySource: "spreadconnect" | "fallback";
  topSub: WearTopSubcategory | null;
};

export default async function WearShopPage({ searchParams }: WearShopProps) {
  const sp = await searchParams;
  const activeCategory = sp.category?.trim().toLowerCase() || null;
  const activeTopSub = isWearTopSubcategory(sp.sub) ? sp.sub : null;

  let products: Awaited<ReturnType<typeof prisma.wearProduct.findMany>> = [];
  let dbUnavailable = false;
  try {
    products = await prisma.wearProduct.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
  } catch {
    dbUnavailable = true;
  }

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
      categorySlug: category.categorySlug,
      categoryLabel: category.categoryLabel,
      fallbackCategory: category.fallbackCategory,
      categorySource: category.source,
      topSub: category.topSub,
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

  const categoryNavItems = Array.from(
    new Map(normalized.map((product) => [product.categorySlug, product.categoryLabel])).entries(),
  ).map(([slug, label]) => ({ slug, label }));
  categoryNavItems.sort((a, b) => a.label.localeCompare(b.label));

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
    <main className="min-h-[60vh] bg-[#f7f2ec] px-4 py-16 text-(--brand-ink) sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-stone-500">Shop</p>
        <h1 className="mt-4 text-center font-serif text-3xl text-amber-950 sm:text-4xl">The drop</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-stone-600">
          Checkout on PotteryMania — same studio story, shipped by our fulfilment partner when you order.
        </p>
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-2">
          <Link
            href="/wear/shop"
            className={`rounded-full border px-3 py-1.5 text-xs ${
              activeCategory == null
                ? "border-amber-300 bg-amber-100 text-amber-950"
                : "border-stone-200 bg-white text-stone-700 hover:border-amber-300/60 hover:text-amber-950"
            }`}
          >
            All
          </Link>
          {categoryNavItems.map((category) => (
            <Link
              key={category.slug}
              href={`/wear/shop?category=${category.slug}`}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                activeCategory === category.slug
                  ? "border-amber-300 bg-amber-100 text-amber-950"
                  : "border-stone-200 bg-white text-stone-700 hover:border-amber-300/60 hover:text-amber-950"
              }`}
            >
              {category.label}
            </Link>
          ))}
        </div>
        {(activeCategory == null || visible.some((product) => product.fallbackCategory === "tops")) &&
        topSubNavItems.length > 1 ? (
          <div className="mx-auto mt-4 flex max-w-4xl flex-wrap items-center justify-center gap-2">
            <Link
              href={activeCategory ? `/wear/shop?category=${activeCategory}` : "/wear/shop"}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                activeTopSub == null
                  ? "border-amber-300 bg-amber-100 text-amber-950"
                  : "border-stone-200 bg-white text-stone-700 hover:border-amber-300/60 hover:text-amber-950"
              }`}
            >
              All tops
            </Link>
            {topSubNavItems.map((sub) => (
              <Link
                key={sub}
                href={`/wear/shop${activeCategory ? `?category=${activeCategory}&sub=${sub}` : `?sub=${sub}`}`}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  activeTopSub === sub
                    ? "border-amber-300 bg-amber-100 text-amber-950"
                    : "border-stone-200 bg-white text-stone-700 hover:border-amber-300/60 hover:text-amber-950"
                }`}
              >
                {wearTopSubcategoryLabel(sub)}
              </Link>
            ))}
          </div>
        ) : null}

        {visible.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md text-center">
            <p className="text-sm leading-relaxed text-stone-600">
              {dbUnavailable
                ? "The wear catalog is temporarily unavailable. Please try again shortly."
                : activeCategory
                ? activeTopSub
                  ? `No items currently in ${wearTopSubcategoryLabel(activeTopSub)}.`
                  : `No items currently in this category.`
                : "We're between drops or restocking the shelf. Check back soon — new pieces always land here first."}
            </p>
            <p className="mt-6 text-sm text-stone-500">
              <Link href="/wear" className="text-amber-950 underline-offset-4 hover:text-amber-800 hover:underline">
                Identity
              </Link>
              <span className="mx-2 text-stone-600">·</span>
              <Link
                href="/early-access"
                className="text-amber-950 underline-offset-4 hover:text-amber-800 hover:underline"
              >
                Create your studio
              </Link>
            </p>
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
          <div className="mt-16 space-y-14">
            {blocks.map((block) =>
              block.kind === "category" ? (
                <section key={block.categorySlug} aria-labelledby={`wear-cat-${block.categorySlug}`}>
                  <h2
                    id={`wear-cat-${block.categorySlug}`}
                    className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500"
                  >
                    {block.heading}
                  </h2>
                  <div className="mt-10 space-y-12">
                    {block.subsections.map((sub) => (
                      <div key={sub.sub}>
                        <h3
                          id={`wear-tops-${sub.sub}`}
                          className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500"
                        >
                          {sub.label}
                        </h3>
                        <ul className="mt-6 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
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
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center bg-stone-100 px-6 text-center text-sm text-stone-500">
                                        Image coming soon
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
                  <ul className="mt-6 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
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
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center bg-stone-100 px-6 text-center text-sm text-stone-500">
                                  Image coming soon
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
