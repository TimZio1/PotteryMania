import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "./add-to-cart";
import { MarketingLayout } from "@/components/marketing-layout";
import { ReviewSummary } from "@/components/review-summary";
import { ui } from "@/lib/ui-styles";
import { getMarketplaceProduct } from "@/lib/products";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ productId: string }> };

export default async function ProductPage({ params }: Props) {
  const { productId } = await params;
  const [result, reviewData] = await Promise.all([
    getMarketplaceProduct(productId),
    prisma.review.findMany({
      where: { productId, isVisible: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { email: true } } },
      take: 8,
    }),
  ]);
  if (!result) notFound();
  const { product, related } = result;
  const avgRating = reviewData.length ? reviewData.reduce((sum, review) => sum + review.rating, 0) / reviewData.length : 0;

  const price = (product.salePriceCents ?? product.priceCents) / 100;

  const toolbar = (
    <Link href="/marketplace" className="text-sm font-medium text-amber-900 hover:text-amber-950">
      ← Back to marketplace
    </Link>
  );

  return (
    <MarketingLayout toolbar={toolbar}>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-stone-100 shadow-sm">
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0].imageUrl} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center text-stone-400">No image</div>
              )}
            </div>
            {product.images.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {product.images.slice(1).map((im) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={im.id} src={im.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-stone-200" />
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <p className="text-sm text-stone-500">
              <Link href={`/studios/${product.studio.id}`} className="font-medium text-amber-900 hover:underline">
                {product.studio.displayName}
              </Link>
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">{product.title}</h1>
            <div className="mt-4 flex items-end gap-3">
              <p className="text-3xl font-semibold text-amber-950">€{price.toFixed(2)}</p>
              {product.salePriceCents ? (
                <p className="text-lg text-stone-400 line-through">€{(product.priceCents / 100).toFixed(2)}</p>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
              {product.category ? <span className="rounded-full bg-stone-100 px-3 py-1">{product.category.name}</span> : null}
              {product.stockQuantity > 0 ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                  {product.stockQuantity} in stock
                </span>
              ) : (
                <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">Out of stock</span>
              )}
              {product.isFeatured ? <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">Featured</span> : null}
            </div>
            {product.shortDescription ? <p className="mt-4 text-stone-700">{product.shortDescription}</p> : null}
            <div className="mt-8">
              <AddToCart
                productId={product.id}
                stockQuantity={product.stockQuantity}
                stockStatus={product.stockStatus}
              />
            </div>
            {product.fullDescription ? (
              <div className="mt-10 border-t border-stone-200 pt-8">
                <h2 className="text-sm font-semibold text-stone-900">About this piece</h2>
                <div className="mt-3 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
                  {product.fullDescription}
                </div>
              </div>
            ) : null}
            {(product.materials || product.careInstructions || product.dimensionsText || product.weightGrams != null) ? (
              <div className="mt-10 border-t border-stone-200 pt-8">
                <h2 className="text-sm font-semibold text-stone-900">Details</h2>
                <dl className="mt-4 space-y-3 text-sm text-stone-600">
                  {product.materials ? (
                    <div>
                      <dt className="font-medium text-stone-800">Materials</dt>
                      <dd>{product.materials}</dd>
                    </div>
                  ) : null}
                  {product.careInstructions ? (
                    <div>
                      <dt className="font-medium text-stone-800">Care</dt>
                      <dd>{product.careInstructions}</dd>
                    </div>
                  ) : null}
                  {product.dimensionsText ? (
                    <div>
                      <dt className="font-medium text-stone-800">Dimensions</dt>
                      <dd>{product.dimensionsText}</dd>
                    </div>
                  ) : null}
                  {product.weightGrams != null ? (
                    <div>
                      <dt className="font-medium text-stone-800">Weight</dt>
                      <dd>{product.weightGrams}g</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
            <div className="mt-8 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-5 text-sm text-stone-600">
              <p>
                <span className="font-medium text-stone-800">Ships from</span> · {product.studio.city},{" "}
                {product.studio.country}
              </p>
              <p className="mt-3">
                <Link href={`/studios/${product.studio.id}`} className="font-medium text-amber-900 hover:underline">
                  View studio profile
                </Link>
              </p>
              {product.shippingNotes ? <p className="mt-3 text-xs">Shipping: {product.shippingNotes}</p> : null}
              {product.returnNotes ? <p className="mt-2 text-xs">Returns: {product.returnNotes}</p> : null}
            </div>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-xl font-semibold text-amber-950">More from this studio</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <Link key={item.id} href={`/marketplace/products/${item.id}`} className={ui.tile}>
                  <div className="aspect-square bg-stone-100">
                    {item.images[0]?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0].imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-medium text-stone-500">{item.studio.displayName}</p>
                    <p className="mt-1 text-sm font-semibold text-stone-900">{item.title}</p>
                    <p className="mt-2 text-sm font-medium text-amber-950">
                      €{(((item.salePriceCents ?? item.priceCents) as number) / 100).toFixed(2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <ReviewSummary title="Reviews" avgRating={avgRating} count={reviewData.length} reviews={reviewData} />
      </main>
    </MarketingLayout>
  );
}
