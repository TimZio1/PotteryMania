import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { listMarketplaceProducts, parseProductSort, type ProductSort } from "@/lib/products";
import { prisma } from "@/lib/db";
import { redirectEndUserIfNoMarketplaceListings } from "@/lib/public-catalog-guard";
import { allCeramicCategories, ceramicCategoryMetaByValue, syncLockedCeramicCategories } from "@/lib/ceramic-categories";
import { buildMetadata } from "@/lib/seo";
import { billingIntervalLabel } from "@/lib/offering-pricing";
import { resolveRequestShippingRegion } from "@/lib/request-region";
import { resolveShippingZoneForDestination, shipsToZone } from "@/lib/shipping-zones";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildMetadata({
  title: "Shop products from studios",
  description: "Browse products sold directly by creators — shop, book classes, and run your own studio on PotteryMania.",
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
  const resolvedRegion = await resolveRequestShippingRegion();
  const sp = (await searchParams) ?? {};
  let catalog: Awaited<ReturnType<typeof listMarketplaceProducts>>;
  try {
    catalog = await listMarketplaceProducts({
      q: sp.q,
      category: sp.category,
      country: sp.country,
      city: sp.city,
      sort: parseProductSort(sp.sort),
      inStock: sp.inStock === "1",
      minPrice: sp.minPrice ? parseInt(sp.minPrice, 10) : undefined,
      maxPrice: sp.maxPrice ? parseInt(sp.maxPrice, 10) : undefined,
      shippingRegion: resolvedRegion.region,
      viewerCountry: resolvedRegion.country,
      page: sp.page ? parseInt(sp.page, 10) : 1,
      pageSize: 12,
    });
  } catch {
    catalog = { products: [], total: 0, page: 1, pageSize: 12, pageCount: 0 };
  }
  let categories: { id: string; name: string; slug: string }[] = allCeramicCategories().map((category) => ({
    id: category.slug,
    name: category.title,
    slug: category.slug,
  }));
  try {
    await syncLockedCeramicCategories(prisma);
    const dbCategories = await prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, slug: true },
    });
    const bySlug = new Map(dbCategories.map((c) => [c.slug, c] as const));
    categories = allCeramicCategories().map((category) => {
      const db = bySlug.get(category.slug);
      return {
        id: db?.id ?? category.slug,
        name: db?.name ?? category.title,
        slug: category.slug,
      };
    });
  } catch {}
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">Products from studios</h1>
          <p className="mt-3 text-[var(--muted)]">
            Pieces from live studios — each listing shows who made it and where they are based.
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Region: <strong className="uppercase">{resolvedRegion.region}</strong> {resolvedRegion.country ? `(${resolvedRegion.country})` : ""}
          </p>
        </div>

        <form className="mt-8 grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
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
            <select className={`${ui.input} mt-1`} name="sort" defaultValue={sp.sort ?? "recommended"}>
              <option value="recommended">Recommended</option>
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
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
            <p className="font-medium text-[var(--foreground)]">No listings yet</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Studios are onboarding their products. Check back soon.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const img = p.images[0]?.imageUrl;
              const price = (p.salePriceCents ?? p.priceCents) / 100;
              const recurring = p.pricingType === "recurring" && p.recurringPriceCents != null && p.billingInterval != null;
              const zone = resolveShippingZoneForDestination({
                destinationCountry: resolvedRegion.country,
                studioCountry: p.studio.country,
              });
              const ships = shipsToZone(
                {
                  shippingDomesticCents: p.shippingDomesticCents,
                  shippingEuropeCents: p.shippingEuropeCents,
                  shippingUsaCents: p.shippingUsaCents,
                  shippingCanadaCents: p.shippingCanadaCents,
                  shippingAsiaCents: p.shippingAsiaCents,
                },
                zone,
              );
              return (
                <Link key={p.id} href={`/marketplace/products/${p.id}`} className={ui.tile}>
                  <div className="aspect-square bg-[var(--surface-elevated)]">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">No image</div>
                    )}
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-[var(--muted)]">{p.studio.displayName}</p>
                    </div>
                    <p className="mt-2">
                      <span className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
                        {ceramicCategoryMetaByValue(p.category).title}
                      </span>
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-[var(--foreground)]">{p.title}</h2>
                    {p.shortDescription ? (
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{p.shortDescription}</p>
                    ) : null}
                    <p className={`mt-2 text-xs font-medium ${ships ? "text-emerald-700" : "text-rose-700"}`}>
                      {ships ? "Ships to your location" : "Not available in your region"}
                    </p>
                    <p className="mt-2 text-lg font-medium text-[var(--foreground)]">
                      {recurring
                        ? `€${(p.recurringPriceCents! / 100).toFixed(2)}/${billingIntervalLabel(
                            p.billingInterval as "weekly" | "monthly" | "custom",
                            p.billingIntervalCount ?? 1,
                          )}`
                        : `€${price.toFixed(2)}`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {catalog.pageCount > 1 ? (
          <div className="mt-10 flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted)]">
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
