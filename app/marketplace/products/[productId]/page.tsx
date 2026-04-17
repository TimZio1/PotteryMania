import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "./add-to-cart";
import { MarketingLayout } from "@/components/marketing-layout";
import { ReviewSummary } from "@/components/review-summary";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductImageGallery } from "@/components/marketplace/product-image-gallery";
import { ui } from "@/lib/ui-styles";
import { getMarketplaceProduct } from "@/lib/products";
import { prisma } from "@/lib/db";
import { ceramicCategoryMetaByValue } from "@/lib/ceramic-categories";
import { buildMetadata } from "@/lib/seo";
import { billingIntervalLabel } from "@/lib/offering-pricing";
import SubscribeButton from "@/components/offerings/subscribe-button";
import { resolveRequestShippingRegion } from "@/lib/request-region";
import { resolveShippingZoneForDestination, zonePriceCents, type ShippingZone } from "@/lib/shipping-zones";
import { breadcrumbJsonLd, productJsonLd, toJsonLdScript } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  try {
    const products = await prisma.product.findMany({
      where: { status: "active", studio: { status: "approved" } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
      take: 100,
    });
    return products.map((product) => ({ productId: product.id }));
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ productId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params;
  const result = await getMarketplaceProduct(productId);
  if (!result) {
    return buildMetadata({
      title: "Product not found",
      description: "This studio product could not be found.",
      path: `/marketplace/products/${productId}`,
    });
  }

  const { product } = result;
  return buildMetadata({
    title: `${product.title} by ${product.studio.displayName}`,
    description:
      product.shortDescription ||
      product.fullDescription ||
      `Buy ${product.title} directly from ${product.studio.displayName}.`,
    path: `/marketplace/products/${productId}`,
    image: product.images[0]?.imageUrl,
  });
}

export default async function ProductPage({ params }: Props) {
  const { productId } = await params;
  const resolvedRegion = await resolveRequestShippingRegion();
  const [result, reviewData] = await Promise.all([
    getMarketplaceProduct(productId),
    prisma.review.findMany({
      where: { productId, isVisible: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { customerProfile: { select: { fullName: true } } } } },
      take: 8,
    }),
  ]);
  if (!result) notFound();
  const { product, related } = result;
  const hasVariants = product.variants.length > 0;
  const totalVariantStock = product.variants.reduce(
    (sum, variant) => (variant.stockQuantity == null ? sum : sum + variant.stockQuantity),
    0,
  );
  const avgRating = reviewData.length ? reviewData.reduce((sum, review) => sum + review.rating, 0) / reviewData.length : 0;

  const price = (product.salePriceCents ?? product.priceCents) / 100;
  const recurring =
    product.pricingType === "recurring" && product.recurringPriceCents != null && product.billingInterval != null;
  const userZone = resolveShippingZoneForDestination({
    destinationCountry: resolvedRegion.country,
    studioCountry: product.studio.country,
  });
  const shipsToUser = zonePriceCents(product, userZone) != null;
  const shippingZoneLabels: Array<{ zone: ShippingZone; label: string }> = [
    { zone: "domestic", label: "Domestic" },
    { zone: "europe", label: "Europe" },
    { zone: "usa", label: "USA" },
    { zone: "canada", label: "Canada" },
    { zone: "asia", label: "Asia" },
  ];

  const toolbar = (
    <Breadcrumbs
      items={[
        { label: product.studio.displayName, href: `/studios/${product.studio.id}` },
        { label: product.title },
      ]}
    />
  );
  const jsonLd = toJsonLdScript([
    productJsonLd({
      path: `/marketplace/products/${product.id}`,
      name: product.title,
      description:
        product.shortDescription ||
        product.fullDescription ||
        `Buy ${product.title} directly from ${product.studio.displayName}.`,
      imageUrls: product.images.map((image) => image.imageUrl),
      brandName: product.studio.displayName,
      category: ceramicCategoryMetaByValue(product.category).title,
      price: recurring ? ((product.recurringPriceCents as number) / 100) : price,
      currency: product.currency,
      availability:
        hasVariants
          ? totalVariantStock > 0
            ? "InStock"
            : "OutOfStock"
          : product.stockQuantity > 0
            ? "InStock"
            : product.stockStatus === "backorder"
              ? "PreOrder"
              : "OutOfStock",
      aggregateRating: reviewData.length ? { ratingValue: avgRating, reviewCount: reviewData.length } : undefined,
    }),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Marketplace", path: "/marketplace" },
      { name: product.studio.displayName, path: `/studios/${product.studio.id}` },
      { name: product.title, path: `/marketplace/products/${product.id}` },
    ]),
  ]);

  return (
    <MarketingLayout toolbar={toolbar}>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <ProductImageGallery
              title={product.title}
              images={product.images.map((image, index) => ({
                id: image.id,
                url: image.imageUrl,
                alt: index === 0 ? product.title : `${product.title} detail view`,
              }))}
            />
          </div>
          <div>
            <p className="text-sm text-stone-500">
              <Link href={`/studios/${product.studio.id}`} className="font-medium text-amber-900 hover:underline">
                {product.studio.displayName}
              </Link>
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">{product.title}</h1>
            <div className="mt-4 flex items-end gap-3">
              <p className="text-3xl font-semibold text-amber-950">
                {recurring
                  ? `€${((product.recurringPriceCents as number) / 100).toFixed(2)}/${billingIntervalLabel(
                      product.billingInterval as "weekly" | "monthly" | "custom",
                      product.billingIntervalCount ?? 1,
                    )}`
                  : `€${price.toFixed(2)}`}
              </p>
              {!recurring && product.salePriceCents ? (
                <p className="text-lg text-stone-400 line-through">€{(product.priceCents / 100).toFixed(2)}</p>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
              <span className="rounded-full bg-stone-100 px-3 py-1">{ceramicCategoryMetaByValue(product.category).title}</span>
              {hasVariants ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                  {product.variants.length} variant{product.variants.length === 1 ? "" : "s"}
                  {totalVariantStock > 0 ? ` · ${totalVariantStock} in stock` : ""}
                </span>
              ) : product.stockQuantity > 0 ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                  {product.stockQuantity} in stock
                </span>
              ) : (
                <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">Out of stock</span>
              )}
              {product.isFeatured ? <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">Featured</span> : null}
            </div>
            {product.shortDescription ? <p className="mt-4 text-stone-700">{product.shortDescription}</p> : null}
            <p className={`mt-3 text-sm font-medium ${shipsToUser ? "text-emerald-700" : "text-rose-700"}`}>
              {shipsToUser ? "Ships to your location" : "Not available in your region"}
            </p>
            <div className="mt-8">
              {recurring ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="text-sm font-medium text-amber-950">Recurring plan</p>
                  <ul className="mt-2 space-y-1 text-xs text-amber-900">
                    <li>Billing cycle: {billingIntervalLabel(product.billingInterval!, product.billingIntervalCount ?? 1)}</li>
                    <li>Auto-renew: {product.autoRenew ? "On" : "Off"}</li>
                    {product.minimumCommitmentCycles ? <li>Minimum commitment: {product.minimumCommitmentCycles} cycles</li> : null}
                    {product.trialPeriodDays ? <li>Trial period: {product.trialPeriodDays} days</li> : null}
                    {product.cancellationPolicyText ? <li>Cancellation: {product.cancellationPolicyText}</li> : null}
                  </ul>
                  <div className="mt-3">
                    <SubscribeButton offeringType="product" offeringId={product.id} cta="Start subscription" />
                  </div>
                </div>
              ) : (
                shipsToUser ? (
                  <AddToCart
                    productId={product.id}
                    stockQuantity={product.stockQuantity}
                    stockStatus={product.stockStatus}
                    variants={product.variants}
                  />
                ) : (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    This product is currently unavailable for your shipping region.
                  </div>
                )
              )}
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
              <div className="mt-3">
                <p className="text-xs font-medium text-stone-800">Shipping availability</p>
                <ul className="mt-1 space-y-1 text-xs">
                  {shippingZoneLabels.map(({ zone, label }) => {
                    const cents = zonePriceCents(product, zone);
                    return (
                      <li key={zone} className={cents == null ? "text-stone-500" : "text-stone-700"}>
                        {label}: {cents == null ? "Not available" : `€${(cents / 100).toFixed(2)}`}
                      </li>
                    );
                  })}
                </ul>
              </div>
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
                      <img src={item.images[0].imageUrl} alt={item.title} className="h-full w-full object-cover" />
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </MarketingLayout>
  );
}
