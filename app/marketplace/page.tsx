import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { listMarketplaceProducts, type ProductSort } from "@/lib/products";
import { prisma } from "@/lib/db";
import { redirectEndUserIfNoMarketplaceListings } from "@/lib/public-catalog-guard";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildMetadata({
  title: "Marketplace",
  description: "Browse ceramics from independent pottery studios across Europe.",
  path: "/marketplace",
});

type Props = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    country?: string;
    city?: string;
    sort?: ProductSort;
    inStock?: string;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
  }>;
};

function buildQuery(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return qs.toString();
}

export default async function MarketplacePage({ searchParams }: Props) {
  const session = await auth();
  await redirectEndUserIfNoMarketplaceListings(session?.user?.role);
  const sp = (await searchParams) ?? {};
  const [catalog, categories] = await Promise.all([
    listMarketplaceProducts({
      q: sp.q,
      category: sp.category,
      country: sp.country,
      city: sp.city,
      sort: (sp.sort || "newest") as ProductSort,
      inStock: sp.inStock === "1",
      minPrice: sp.minPrice ? parseInt(sp.minPrice, 10) : undefined,
      maxPrice: sp.maxPrice ? parseInt(sp.maxPrice, 10) : undefined,
      page: sp.page ? parseInt(sp.page, 10) : 1,
      pageSize: 12,
    }),
    prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const products = catalog.products;
  const prevQuery = buildQuery({
    q: sp.q,
    category: sp.category,
    country: sp.country,
    city: sp.city,
    sort: sp.sort,
    inStock: sp.inStock,
    minPrice: sp.minPrice,
    maxPrice: sp.maxPrice,
    page: String(Math.max(1, catalog.page - 1)),
  });
  const nextQuery = buildQuery({
    q: sp.q,
    category: sp.category,
    country: sp.country,
    city: sp.city,
    sort: sp.sort,
    inStock: sp.inStock,
    minPrice: sp.minPrice,
    maxPrice: sp.maxPrice,
    page: String(Math.min(catalog.pageCount, catalog.page + 1)),
  });

  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <div className="max-w-2xl">
          <p className={ui.overline}>Shop</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">Marketplace</h1>
          <p className="mt-3 text-stone-600">
            Pieces from approved studios — each listing shows who made it and where they are based.
          </p>
        </div>

        <form className="mt-8 grid gap-4 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          <label className="block lg:col-span-2">
            <span className={ui.label}>Search</span>
            <input className={`${ui.input} mt-1`} name="q" defaultValue={sp.q ?? ""} placeholder="Mug, vase, stoneware, studio…" />
          </label>
          <label className="block">
            <span className={ui.label}>Category</span>
            <select className={`${ui.input} mt-1`} name="category" defaultValue={sp.category ?? ""}>
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={ui.label}>Sort</span>
            <select className={`${ui.input} mt-1`} name="sort" defaultValue={sp.sort ?? "newest"}>
              <option value="newest">Newest</option>
              <option value="featured">Featured</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>
          <label className="block">
            <span className={ui.label}>In stock</span>
            <select className={`${ui.input} mt-1`} name="inStock" defaultValue={sp.inStock ?? ""}>
              <option value="">All</option>
              <option value="1">Only in stock</option>
            </select>
          </label>

          <label className="block">
            <span className={ui.label}>Min price (€)</span>
            <input className={`${ui.input} mt-1`} name="minPrice" defaultValue={sp.minPrice ?? ""} inputMode="numeric" />
          </label>
          <label className="block">
            <span className={ui.label}>Max price (€)</span>
            <input className={`${ui.input} mt-1`} name="maxPrice" defaultValue={sp.maxPrice ?? ""} inputMode="numeric" />
          </label>
          <label className="block">
            <span className={ui.label}>Country</span>
            <input className={`${ui.input} mt-1`} name="country" defaultValue={sp.country ?? ""} />
          </label>
          <label className="block">
            <span className={ui.label}>City</span>
            <input className={`${ui.input} mt-1`} name="city" defaultValue={sp.city ?? ""} />
          </label>
          <div className="flex items-end gap-3 lg:col-span-1">
            <button className={ui.buttonPrimary} type="submit">
              Apply
            </button>
            <Link href="/marketplace" className={ui.buttonSecondary}>
              Reset
            </Link>
          </div>
        </form>

        {products.length === 0 ? (
          <div className={`${ui.cardMuted} mt-10 max-w-lg`}>
            <p className="font-medium text-stone-800">No listings yet</p>
            <p className="mt-2 text-sm text-stone-600">
              Studios are onboarding. Check back soon, or browse{" "}
              <Link href="/classes" className="font-medium text-amber-900 underline underline-offset-2">
                classes
              </Link>{" "}
              in the meantime.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const img = p.images[0]?.imageUrl;
              const price = (p.salePriceCents ?? p.priceCents) / 100;
              return (
                <Link key={p.id} href={`/marketplace/products/${p.id}`} className={ui.tile}>
                  <div className="aspect-square bg-stone-100">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-stone-400">No image</div>
                    )}
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-stone-500">{p.studio.displayName}</p>
                      {p.isFeatured ? <span className="text-xs font-medium text-amber-900">Featured</span> : null}
                    </div>
                    <h2 className="mt-1 text-base font-semibold text-stone-900">{p.title}</h2>
                    {p.shortDescription ? (
                      <p className="mt-2 line-clamp-2 text-sm text-stone-600">{p.shortDescription}</p>
                    ) : null}
                    <p className="mt-2 text-lg font-medium text-amber-950">€{price.toFixed(2)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {catalog.pageCount > 1 ? (
          <div className="mt-10 flex items-center justify-between gap-3">
            <p className="text-sm text-stone-500">
              Page {catalog.page} of {catalog.pageCount}
            </p>
            <div className="flex gap-3">
              {catalog.page > 1 ? (
                <Link href={`/marketplace?${prevQuery}`} className={ui.buttonSecondary}>
                  Previous
                </Link>
              ) : null}
              {catalog.page < catalog.pageCount ? (
                <Link href={`/marketplace?${nextQuery}`} className={ui.buttonPrimary}>
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </MarketingLayout>
  );
}
