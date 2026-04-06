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
          Same story as the identity page — now checkout stays on PotteryMania, with our layout and typography.
        </p>

        {products.length === 0 ? (
          <p className="mt-16 text-center text-sm text-neutral-500">
            No pieces live yet. Run <span className="font-mono text-neutral-400">npx prisma db seed</span> or add rows in
            the database.
          </p>
        ) : (
          <ul className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const imgs = wearImageUrlsFromJson(p.images);
              const src = imgs[0];
              return (
                <li key={p.id}>
                  <Link href={`/wear/${p.slug}`} className="group block">
                    <div className="relative aspect-[3/4] overflow-hidden bg-neutral-900">
                      {src ? (
                        <Image
                          src={src}
                          alt={p.name}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-[1.02]"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : null}
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
