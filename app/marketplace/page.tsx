import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const products = await prisma.product.findMany({
    where: { status: "active", studio: { status: "approved" } },
    orderBy: { createdAt: "desc" },
    take: 48,
    include: {
      studio: { select: { displayName: true, city: true, country: true } },
      images: { where: { isPrimary: true }, take: 1 },
    },
  });

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl justify-between">
          <Link href="/" className="font-semibold text-amber-900">
            PotteryMania
          </Link>
          <Link href="/cart" className="text-sm text-stone-700">
            Cart
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-amber-950">Marketplace</h1>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const img = p.images[0]?.imageUrl;
            const price = (p.salePriceCents ?? p.priceCents) / 100;
            return (
              <Link
                key={p.id}
                href={`/marketplace/products/${p.id}`}
                className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:shadow"
              >
                <div className="aspect-square bg-stone-100">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="text-xs text-stone-500">{p.studio.displayName}</p>
                  <h2 className="font-medium text-stone-900">{p.title}</h2>
                  <p className="mt-1 text-amber-900">€{price.toFixed(2)}</p>
                </div>
              </Link>
            );
          })}
        </div>
        {products.length === 0 && <p className="text-stone-500">No products yet.</p>}
      </main>
    </div>
  );
}