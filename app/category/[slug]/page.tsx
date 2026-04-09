import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingLayout } from "@/components/marketing-layout";
import { prisma } from "@/lib/db";
import { ui } from "@/lib/ui-styles";
import { buildMetadata } from "@/lib/seo";
import { listMarketplaceProducts, parseProductSort, type ProductSort } from "@/lib/products";
import {
  allCeramicCategories,
  ceramicCategoryFromSlug,
  ceramicCategoryMetaBySlug,
  syncLockedCeramicCategories,
} from "@/lib/ceramic-categories";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    q?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    sort?: ProductSort;
    studioId?: string;
    page?: string;
  }>;
};

function parsePriceToCents(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

function buildQuery(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return qs.toString();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const fallback = ceramicCategoryMetaBySlug(slug);
  if (!fallback) {
    return buildMetadata({
      title: "Category not found",
      description: "This ceramic category could not be found.",
      path: `/category/${slug}`,
    });
  }

  let longDescription = fallback.longDescription;
  try {
    const dbCategory = await prisma.productCategory.findUnique({
      where: { slug },
      select: { longDescription: true },
    });
    if (dbCategory?.longDescription) longDescription = dbCategory.longDescription;
  } catch {
    // Ignore DB lookup failure and keep locked metadata fallback.
  }

  return buildMetadata({
    title: `Handmade ${fallback.title} | PotteryMania`,
    description: longDescription,
    path: `/category/${slug}`,
    image: fallback.imageUrl,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const categoryMeta = ceramicCategoryMetaBySlug(slug);
  const categoryEnum = ceramicCategoryFromSlug(slug);
  if (!categoryMeta || !categoryEnum) notFound();

  const sp = (await searchParams) ?? {};
  const page = sp.page ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  let categoryData = categoryMeta;
  try {
    await syncLockedCeramicCategories(prisma);
    const dbCategory = await prisma.productCategory.findUnique({
      where: { slug },
      select: {
        name: true,
        shortDescription: true,
        longDescription: true,
        imageUrl: true,
        icon: true,
      },
    });
    if (dbCategory) {
      categoryData = {
        ...categoryMeta,
        title: dbCategory.name,
        shortDescription: dbCategory.shortDescription,
        longDescription: dbCategory.longDescription,
        imageUrl: dbCategory.imageUrl,
        icon: dbCategory.icon ?? categoryMeta.icon,
      };
    }
  } catch {
    // Keep locked fallback data.
  }

  const listing = await listMarketplaceProducts({
    category: slug,
    q: sp.q,
    studioId: sp.studioId,
    inStock: sp.inStock === "1",
    minPrice: parsePriceToCents(sp.minPrice),
    maxPrice: parsePriceToCents(sp.maxPrice),
    sort: parseProductSort(sp.sort),
    page,
    pageSize: 16,
  });

  const studios = await prisma.studio.findMany({
    where: {
      status: "approved",
      stripeAccount: { is: { chargesEnabled: true, payoutsEnabled: true } },
      products: {
        some: {
          status: "active",
          category: categoryEnum,
        },
      },
    },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
    take: 100,
  });

  const prevQuery = buildQuery({
    ...sp,
    page: String(Math.max(1, listing.page - 1)),
  });
  const nextQuery = buildQuery({
    ...sp,
    page: String(Math.min(listing.pageCount, listing.page + 1)),
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${categoryData.title} on PotteryMania`,
    itemListElement: listing.products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1 + (listing.page - 1) * listing.pageSize,
      url: `https://potterymania.com/marketplace/products/${product.id}`,
      name: product.title,
    })),
  };

  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-6 sm:py-10`}>
        <section className="relative overflow-hidden rounded-3xl border border-stone-200 bg-stone-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={categoryData.imageUrl}
            alt={categoryData.title}
            className="h-[220px] w-full object-cover opacity-65 sm:h-[280px]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/55 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
            <p className="text-xs uppercase tracking-[0.16em] text-white/75">Shop by Category</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{categoryData.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">{categoryData.shortDescription}</p>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-stone-900">Filters</p>
            <form className="mt-4 space-y-4">
              <input type="hidden" name="page" value="1" />
              <label className="block">
                <span className={ui.label}>Search</span>
                <input name="q" defaultValue={sp.q ?? ""} className={`${ui.input} mt-1`} placeholder="Title, material..." />
              </label>

              <label className="block">
                <span className={ui.label}>Studio</span>
                <select name="studioId" defaultValue={sp.studioId ?? ""} className={`${ui.input} mt-1`}>
                  <option value="">All studios</option>
                  {studios.map((studio) => (
                    <option key={studio.id} value={studio.id}>
                      {studio.displayName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className={ui.label}>Min price (€)</span>
                  <input name="minPrice" defaultValue={sp.minPrice ?? ""} className={`${ui.input} mt-1`} inputMode="decimal" />
                </label>
                <label className="block">
                  <span className={ui.label}>Max price (€)</span>
                  <input name="maxPrice" defaultValue={sp.maxPrice ?? ""} className={`${ui.input} mt-1`} inputMode="decimal" />
                </label>
              </div>

              <label className="block">
                <span className={ui.label}>Availability</span>
                <select name="inStock" defaultValue={sp.inStock ?? ""} className={`${ui.input} mt-1`}>
                  <option value="">All</option>
                  <option value="1">In stock only</option>
                </select>
              </label>

              <label className="block">
                <span className={ui.label}>Sort</span>
                <select name="sort" defaultValue={sp.sort ?? "popular"} className={`${ui.input} mt-1`}>
                  <option value="popular">Popular</option>
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                </select>
              </label>

              <div className="flex gap-2">
                <button className={ui.buttonPrimary} type="submit">
                  Apply
                </button>
                <Link href={`/category/${slug}`} className={ui.buttonSecondary}>
                  Reset
                </Link>
              </div>
            </form>
          </aside>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-stone-500">
                {listing.total} product{listing.total === 1 ? "" : "s"} in {categoryData.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {allCeramicCategories().map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className={`rounded-full px-3 py-1 text-xs ${
                      cat.slug === slug
                        ? "bg-amber-100 text-amber-900"
                        : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {cat.title}
                  </Link>
                ))}
              </div>
            </div>

            {listing.products.length === 0 ? (
              <div className={`${ui.cardMuted} py-10`}>
                <p className="font-medium text-stone-800">No products match these filters.</p>
                <p className="mt-2 text-sm text-stone-600">Try broadening price range, studio, or availability.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {listing.products.map((product) => {
                  const image = product.images[0]?.imageUrl;
                  const price = (product.salePriceCents ?? product.priceCents) / 100;
                  return (
                    <Link key={product.id} href={`/marketplace/products/${product.id}`} className={ui.tile}>
                      <div className="aspect-square bg-stone-100">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt={product.title} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-stone-400">No image</div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-stone-500">{product.studio.displayName}</p>
                        <h2 className="mt-1 text-sm font-semibold text-stone-900">{product.title}</h2>
                        <p className="mt-2">
                          <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] text-stone-600">
                            {categoryData.title}
                          </span>
                        </p>
                        <p className="mt-2 text-base font-medium text-amber-950">€{price.toFixed(2)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {listing.pageCount > 1 ? (
              <div className="mt-8 flex items-center justify-between gap-3">
                <p className="text-sm text-stone-500">
                  Page {listing.page} of {listing.pageCount}
                </p>
                <div className="flex gap-3">
                  {listing.page > 1 ? (
                    <Link href={`/category/${slug}?${prevQuery}`} className={ui.buttonSecondary}>
                      Previous
                    </Link>
                  ) : null}
                  {listing.page < listing.pageCount ? (
                    <Link href={`/category/${slug}?${nextQuery}`} className={ui.buttonPrimary}>
                      Next
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </MarketingLayout>
  );
}
