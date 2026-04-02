import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AddToCart } from "./add-to-cart";

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

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white px-4 py-4">
        <Link href="/marketplace" className="text-sm text-amber-800">
          ← Marketplace
        </Link>
      </header>
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-lg bg-stone-200">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0].imageUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="mt-2 flex gap-2">
            {product.images.slice(1).map((im) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={im.id} src={im.imageUrl} alt="" className="h-16 w-16 rounded object-cover" />
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-stone-500">{product.studio.displayName}</p>
          <h1 className="mt-1 text-3xl font-light text-amber-950">{product.title}</h1>
          <p className="mt-4 text-2xl text-amber-900">€{price.toFixed(2)}</p>
          {product.shortDescription && <p className="mt-4 text-stone-600">{product.shortDescription}</p>}
          <AddToCart productId={product.id} />
          {product.fullDescription && (
            <div className="mt-8 max-w-none whitespace-pre-wrap text-stone-700">{product.fullDescription}</div>
          )}
          <div className="mt-8 border-t border-stone-200 pt-6 text-sm text-stone-600">
            <p>
              <strong>Studio</strong> · {product.studio.city}, {product.studio.country}
            </p>
            {product.shippingNotes && <p className="mt-2">Shipping: {product.shippingNotes}</p>}
            {product.returnNotes && <p className="mt-2">Returns: {product.returnNotes}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}