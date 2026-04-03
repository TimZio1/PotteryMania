import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AddToCart } from "./add-to-cart";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ productId: string }> };

export default async function ProductPage({ params }: Props) {
  const { productId } = await params;
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      status: "active",
      studio: { status: "approved" },
    },
    include: {
      studio: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) notFound();

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
            <p className="mt-4 text-3xl font-semibold text-amber-950">€{price.toFixed(2)}</p>
            {product.shortDescription ? <p className="mt-4 text-stone-700">{product.shortDescription}</p> : null}
            <div className="mt-8">
              <AddToCart productId={product.id} />
            </div>
            {product.fullDescription ? (
              <div className="mt-10 border-t border-stone-200 pt-8">
                <h2 className="text-sm font-semibold text-stone-900">About this piece</h2>
                <div className="mt-3 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
                  {product.fullDescription}
                </div>
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
      </main>
    </MarketingLayout>
  );
}
