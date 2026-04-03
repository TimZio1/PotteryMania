import Link from "next/link";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";

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
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <div className="max-w-2xl">
          <p className={ui.overline}>Shop</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">Marketplace</h1>
          <p className="mt-3 text-stone-600">
            Pieces from approved studios — each listing shows who made it and where they are based.
          </p>
        </div>

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
                    <p className="text-xs font-medium text-stone-500">{p.studio.displayName}</p>
                    <h2 className="mt-1 text-base font-semibold text-stone-900">{p.title}</h2>
                    <p className="mt-2 text-lg font-medium text-amber-950">€{price.toFixed(2)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </MarketingLayout>
  );
}
