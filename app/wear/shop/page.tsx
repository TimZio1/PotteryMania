import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { formatWearMoney } from "@/lib/wear-money";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";

/** DB (Prisma) is not available during static export / build-time prerender. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Wear — Shop",
  description: "PotteryMania wear — shop the drop in our own storefront.",
  path: "/wear/shop",
});

export default async function WearShopPage() {
  const products = await prisma.wearProduct.findMany({
    where: { isActive: true, archivedAt: null },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <main className="min-h-[60vh] bg-neutral-950 px-4 py-16 text-neutral-100 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-neutral-500">Shop</p>
        <h1 className="mt-4 text-center font-serif text-3xl text-white sm:text-4xl">The drop</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-neutral-400">
          Checkout on PotteryMania — same studio story, shipped by our fulfilment partner when you order.
        </p>

        {products.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md text-center">
            <p className="text-sm leading-relaxed text-neutral-300">
              We&apos;re between drops or restocking the shelf. Check back soon — new pieces always land here first.
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
                Studio early access
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
          <ul className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const imgs = wearImageUrlsFromJson(p.images);
              const src = imgs[0];
              return (
                <li key={p.id}>
                  <Link href={`/wear/${p.slug}`} className="group block">
                    <div className="relative aspect-3/4 overflow-hidden bg-neutral-900">
                      {src ? (
                        <Image
                          src={src}
                          alt={p.name}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-[1.02]"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-neutral-900 px-6 text-center text-sm text-neutral-400">
                          Image coming soon
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <h2 className="font-medium text-white">{p.name}</h2>
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
        )}
      </div>
    </main>
  );
}
