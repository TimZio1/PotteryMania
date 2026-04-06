import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";
import { WearPdpBuySection } from "@/components/wear/wear-pdp-buy-section";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.wearProduct.findFirst({
    where: { slug, isActive: true, archivedAt: null },
    select: { name: true, subtitle: true, description: true },
  });
  if (!p) {
    return buildMetadata({
      title: "Wear",
      description: "PotteryMania wear.",
      path: `/wear/${slug}`,
    });
  }
  const desc = p.subtitle ?? p.description ?? `${p.name} — PotteryMania wear.`;
  return buildMetadata({
    title: `${p.name} — Wear`,
    description: desc.slice(0, 160),
    path: `/wear/${slug}`,
  });
}

export default async function WearProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await prisma.wearProduct.findFirst({
    where: { slug, isActive: true, archivedAt: null },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      },
    },
  });
  if (!p) notFound();

  const imgs = wearImageUrlsFromJson(p.images);
  const primary = imgs[0];
  const rest = imgs.slice(1);

  const variantProps = p.variants.map((v) => ({
    id: v.id,
    label: v.label,
    priceCents: v.priceCents,
    stockQuantity: v.stockQuantity,
  }));

  return (
    <main className="bg-neutral-950 px-4 py-12 text-neutral-100 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="relative aspect-[3/4] bg-neutral-900 lg:aspect-auto lg:min-h-[min(80vh,640px)]">
            {primary ? (
              <Image
                src={primary}
                alt={p.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : null}
          </div>
          {rest.length > 0 ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {rest.map((src) => (
                <div key={src} className="relative h-20 w-16 shrink-0 overflow-hidden bg-neutral-900 sm:h-24 sm:w-20">
                  <Image src={src} alt="" fill className="object-cover" sizes="80px" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col justify-center">
          <Link
            href="/wear/shop"
            className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500 transition hover:text-neutral-300"
          >
            ← Shop
          </Link>
          <h1 className="mt-6 font-serif text-3xl text-white sm:text-4xl">{p.name}</h1>
          {p.subtitle ? <p className="mt-3 text-lg text-neutral-400">{p.subtitle}</p> : null}
          <WearPdpBuySection
            productId={p.id}
            basePriceCents={p.priceCents}
            currency={p.currency}
            variants={variantProps}
          />
          {p.description ? (
            <div className="mt-12 border-t border-white/10 pt-10">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Details</p>
              <p className="mt-4 text-sm leading-relaxed text-neutral-400 whitespace-pre-line">{p.description}</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
