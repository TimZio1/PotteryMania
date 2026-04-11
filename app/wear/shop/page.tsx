import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { formatWearMoney } from "@/lib/wear-money";
import {
  WEAR_CATEGORIES,
  WEAR_CATEGORY_LABELS,
  WEAR_TOP_SUBCATEGORIES,
  type WearCategory,
  type WearTopSubcategory,
  isWearCategory,
  isWearTopSubcategory,
  resolveWearCategory,
  resolveWearTopSubcategory,
  wearCategoryLabel,
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
  category: WearCategory;
  topSub: WearTopSubcategory | null;
};

export default async function WearShopPage({ searchParams }: WearShopProps) {
  const sp = await searchParams;
  const activeCategory = isWearCategory(sp.category) ? sp.category : null;
  const activeTopSub =
    activeCategory === "tops" && isWearTopSubcategory(sp.sub) ? sp.sub : null;

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
  });

  const normalized: WearShopProduct[] = products.map((p) => {
    const category = resolveWearCategory(catInput(p));
    const topSub = category === "tops" ? resolveWearTopSubcategory(catInput(p)) : null;
    return { ...p, category, topSub };
  });

  let visible: WearShopProduct[] = activeCategory
    ? normalized.filter((p) => p.category === activeCategory)
    : normalized;
  if (activeCategory === "tops" && activeTopSub) {
    visible = visible.filter((p) => p.topSub === activeTopSub);
  }

  const topsSubsInCatalog = new Set(
    normalized
      .filter((p): p is WearShopProduct & { topSub: WearTopSubcategory } => p.category === "tops" && p.topSub != null)
      .map((p) => p.topSub),
  );
  const topSubNavItems = WEAR_TOP_SUBCATEGORIES.filter((s) => topsSubsInCatalog.has(s));

  type ShopBlock =
    | {
        kind: "tops";
        heading: string;
        subsections: { sub: WearTopSubcategory; label: string; products: WearShopProduct[] }[];
      }
    | {
        kind: "simple";
        category: WearCategory;
        heading: string;
        products: WearShopProduct[];
      };

  const blocks: ShopBlock[] = [];
  for (const cat of WEAR_CATEGORIES) {
    const inCat = visible.filter((p) => p.category === cat);
    if (!inCat.length) continue;
    if (cat === "tops") {
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
          kind: "tops",
          heading: WEAR_CATEGORY_LABELS.tops,
          subsections,
        });
      }
    } else {
      blocks.push({ kind: "simple", category: cat, heading: WEAR_CATEGORY_LABELS[cat], products: inCat });
    }
  }

  return (
    <main className="min-h-[60vh] bg-linear-to-b from-[#231a15] via-[#1a1310] to-[#14100d] px-4 py-16 text-stone-100 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-stone-500">Shop</p>
        <h1 className="mt-4 text-center font-serif text-3xl text-stone-50 sm:text-4xl">The drop</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-stone-400">
          Checkout on PotteryMania — same studio story, shipped by our fulfilment partner when you order.
        </p>
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-2">
          <Link
            href="/wear/shop"
            className={`rounded-full border px-3 py-1.5 text-xs ${
              activeCategory == null
                ? "border-amber-400/50 bg-amber-500/15 text-amber-50"
                : "border-stone-600/50 text-stone-300 hover:border-amber-400/35 hover:text-stone-100"
            }`}
          >
            All
          </Link>
          {WEAR_CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/wear/shop?category=${category}`}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                activeCategory === category
                  ? "border-amber-400/50 bg-amber-500/15 text-amber-50"
                  : "border-stone-600/50 text-stone-300 hover:border-amber-400/35 hover:text-stone-100"
              }`}
            >
              {WEAR_CATEGORY_LABELS[category]}
            </Link>
          ))}
        </div>
        {activeCategory === "tops" && topSubNavItems.length > 1 ? (
          <div className="mx-auto mt-4 flex max-w-4xl flex-wrap items-center justify-center gap-2">
            <Link
              href="/wear/shop?category=tops"
              className={`rounded-full border px-3 py-1.5 text-xs ${
                activeTopSub == null
                  ? "border-amber-400/45 bg-amber-500/12 text-amber-50"
                  : "border-stone-600/50 text-stone-400 hover:border-amber-400/35 hover:text-stone-100"
              }`}
            >
              All tops
            </Link>
            {topSubNavItems.map((sub) => (
              <Link
                key={sub}
                href={`/wear/shop?category=tops&sub=${sub}`}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  activeTopSub === sub
                    ? "border-amber-400/45 bg-amber-500/12 text-amber-50"
                    : "border-stone-600/50 text-stone-400 hover:border-amber-400/35 hover:text-stone-100"
                }`}
              >
                {wearTopSubcategoryLabel(sub)}
              </Link>
            ))}
          </div>
        ) : null}

        {visible.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md text-center">
            <p className="text-sm leading-relaxed text-stone-300">
              {dbUnavailable
                ? "The wear catalog is temporarily unavailable. Please try again shortly."
                : activeCategory
                ? activeTopSub
                  ? `No items currently in ${wearTopSubcategoryLabel(activeTopSub)}.`
                  : `No items currently in ${wearCategoryLabel(activeCategory)}.`
                : "We're between drops or restocking the shelf. Check back soon — new pieces always land here first."}
            </p>
            <p className="mt-6 text-sm text-stone-500">
              <Link href="/wear" className="text-stone-200 underline-offset-4 hover:text-amber-50 hover:underline">
                Identity
              </Link>
              <span className="mx-2 text-stone-600">·</span>
              <Link
                href="/early-access"
                className="text-stone-200 underline-offset-4 hover:text-amber-50 hover:underline"
              >
                Create your studio
              </Link>
            </p>
            {process.env.NODE_ENV === "development" ? (
              <p className="mt-8 font-mono text-[11px] text-stone-600">
                Dev: run <span className="text-stone-400">npx prisma db seed</span> or use{" "}
                <Link href="/admin/wear-products" className="text-stone-400 underline hover:text-stone-300">
                  /admin/wear-products
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-16 space-y-14">
            {blocks.map((block) =>
              block.kind === "tops" ? (
                <section key="tops-block" aria-labelledby="wear-cat-tops">
                  <h2
                    id="wear-cat-tops"
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
                                  <div className="relative aspect-3/4 overflow-hidden bg-[#2c221c]/90 ring-1 ring-stone-800/40">
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
                                      <div className="flex h-full items-center justify-center bg-[#2c221c] px-6 text-center text-sm text-stone-500">
                                        Image coming soon
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <h4 className="font-medium text-stone-50">{p.name}</h4>
                                    {p.isFeatured ? (
                                      <span className="rounded-full border border-amber-400/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">
                                        Featured
                                      </span>
                                    ) : null}
                                  </div>
                                  {p.subtitle ? <p className="mt-1 text-sm text-stone-500">{p.subtitle}</p> : null}
                                  <p className="mt-2 text-sm text-stone-300">
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
                <section key={block.category} aria-labelledby={`wear-cat-${block.category}`}>
                  <h2
                    id={`wear-cat-${block.category}`}
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
                            <div className="relative aspect-3/4 overflow-hidden bg-[#2c221c]/90 ring-1 ring-stone-800/40">
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
                                <div className="flex h-full items-center justify-center bg-[#2c221c] px-6 text-center text-sm text-stone-500">
                                  Image coming soon
                                </div>
                              )}
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <h3 className="font-medium text-stone-50">{p.name}</h3>
                              {p.isFeatured ? (
                                <span className="rounded-full border border-amber-400/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">
                                  Featured
                                </span>
                              ) : null}
                            </div>
                            {p.subtitle ? <p className="mt-1 text-sm text-stone-500">{p.subtitle}</p> : null}
                            <p className="mt-2 text-sm text-stone-300">{formatWearMoney(p.priceCents, p.currency)}</p>
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
