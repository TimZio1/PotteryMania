import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { formatWearMoney } from "@/lib/wear-money";
import {
  WEAR_CATEGORIES,
  WEAR_CATEGORY_LABELS,
  isWearCategory,
  resolveWearCategory,
  wearCategoryLabel,
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
  searchParams: Promise<{ category?: string }>;
};

export default async function WearShopPage({ searchParams }: WearShopProps) {
  const sp = await searchParams;
  const activeCategory = isWearCategory(sp.category) ? sp.category : null;

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

  const normalized = products.map((p) => {
    const category = resolveWearCategory({
      slug: p.slug,
      name: p.name,
      subtitle: p.subtitle,
      description: p.description,
    });
    return { ...p, category };
  });

  const visible = activeCategory ? normalized.filter((p) => p.category === activeCategory) : normalized;

  const grouped = WEAR_CATEGORIES.map((category) => ({
    category,
    label: WEAR_CATEGORY_LABELS[category],
    products: visible.filter((p) => p.category === category),
  })).filter((g) => g.products.length > 0);

  return (
    <main className="min-h-[60vh] bg-neutral-950 px-4 py-16 text-neutral-100 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-neutral-500">Shop</p>
        <h1 className="mt-4 text-center font-serif text-3xl text-white sm:text-4xl">The drop</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-neutral-400">
          Checkout on PotteryMania — same studio story, shipped by our fulfilment partner when you order.
        </p>
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-2">
          <Link
            href="/wear/shop"
            className={`rounded-full border px-3 py-1.5 text-xs ${
              activeCategory == null
                ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                : "border-white/20 text-neutral-300 hover:border-white/40"
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
                  ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                  : "border-white/20 text-neutral-300 hover:border-white/40"
              }`}
            >
              {WEAR_CATEGORY_LABELS[category]}
            </Link>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md text-center">
            <p className="text-sm leading-relaxed text-neutral-300">
              {dbUnavailable
                ? "The wear catalog is temporarily unavailable. Please try again shortly."
                : activeCategory
                ? `No items currently in ${wearCategoryLabel(activeCategory)}.`
                : "We're between drops or restocking the shelf. Check back soon — new pieces always land here first."}
            </p>
            <p className="mt-6 text-sm text-neutral-500">
              <Link href="/wear" className="text-neutral-200 underline-offset-4 hover:text-white hover:underline">
                Identity
              </Link>
              <span className="mx-2 text-neutral-600">·</span>
              <Link
                href="/early-access"
                className="text-neutral-200 underline-offset-4 hover:text-white hover:underline"
              >
                Create your studio
              </Link>
            </p>
            {process.env.NODE_ENV === "development" ? (
              <p className="mt-8 font-mono text-[11px] text-neutral-600">
                Dev: run <span className="text-neutral-400">npx prisma db seed</span> or use{" "}
                <Link href="/admin/wear-products" className="text-neutral-400 underline hover:text-neutral-300">
                  /admin/wear-products
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-16 space-y-14">
            {grouped.map((group) => (
              <section key={group.category} aria-labelledby={`wear-cat-${group.category}`}>
                <h2 id={`wear-cat-${group.category}`} className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  {group.label}
                </h2>
                <ul className="mt-6 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                  {group.products.map((p) => {
                    const imgs = wearImageUrlsFromJson(p.images);
                    const src = imgs[0];
                    return (
                      <li key={p.id}>
                        <Link href={`/wear/${p.slug}`} className="group block">
                          <div className="relative aspect-3/4 overflow-hidden bg-neutral-900">
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
                              <div className="flex h-full items-center justify-center bg-neutral-900 px-6 text-center text-sm text-neutral-400">
                                Image coming soon
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-white">{p.name}</h3>
                            {p.isFeatured ? (
                              <span className="rounded-full border border-amber-400/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">
                                Featured
                              </span>
                            ) : null}
                          </div>
                          {p.subtitle ? <p className="mt-1 text-sm text-neutral-500">{p.subtitle}</p> : null}
                          <p className="mt-2 text-sm text-neutral-300">{formatWearMoney(p.priceCents, p.currency)}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
