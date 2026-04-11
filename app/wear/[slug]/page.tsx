import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import {
  resolveWearCategory,
  resolveWearTopSubcategory,
  wearCategoryLabel,
  wearTopSubcategoryLabel,
} from "@/lib/wear-categories";
import { wearListingImageSrc } from "@/lib/wear-listing-image";
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
  const category = resolveWearCategory({
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
  });
  const topSub =
    category === "tops"
      ? resolveWearTopSubcategory({
          slug: p.slug,
          name: p.name,
          subtitle: p.subtitle,
          description: p.description,
        })
      : null;

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
    <main className="bg-linear-to-b from-[#231a15] via-[#1a1310] to-[#14100d] px-4 py-12 text-stone-100 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl rounded-3xl border border-stone-700/40 bg-[#1f1814]/75 p-5 shadow-[0_22px_80px_-32px_rgba(20,12,8,0.55)] backdrop-blur-sm sm:p-7 lg:p-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="relative aspect-3/4 overflow-hidden rounded-2xl border border-stone-700/40 bg-[#2c221c]/80 ring-1 ring-stone-800/50 lg:aspect-auto lg:min-h-[min(80vh,640px)]">
            {primary ? (
              <Image
                src={wearListingImageSrc(primary, 960)}
                alt={p.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                quality={78}
                priority
                fetchPriority="high"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-stone-500">
                Image coming soon
              </div>
            )}
          </div>
          {rest.length > 0 ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {rest.map((src) => (
                <div
                  key={src}
                  className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-stone-700/40 bg-[#2c221c]/80 sm:h-24 sm:w-20"
                >
                  <Image
                    src={wearListingImageSrc(src, 320)}
                    alt={`${p.name} detail view`}
                    fill
                    className="object-cover"
                    sizes="96px"
                    quality={62}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col justify-center lg:pr-2">
          <Link
            href={
              category === "tops" && topSub
                ? `/wear/shop?category=tops&sub=${topSub}`
                : category === "tops"
                  ? "/wear/shop?category=tops"
                  : "/wear/shop"
            }
            className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400 transition hover:text-amber-100/90"
          >
            ← Shop
          </Link>
          <h1 className="mt-6 font-serif text-3xl leading-tight tracking-tight text-stone-50 sm:text-4xl">{p.name}</h1>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/80">
            {wearCategoryLabel(category)}
            {topSub ? <> · {wearTopSubcategoryLabel(topSub)}</> : null}
          </p>
          {p.subtitle ? <p className="mt-3 text-lg text-stone-300">{p.subtitle}</p> : null}
          <WearPdpBuySection
            productId={p.id}
            basePriceCents={p.priceCents}
            currency={p.currency}
            variants={variantProps}
          />
          {p.description ? (
            <div className="mt-12 border-t border-stone-700/40 pt-10">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Details</p>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-stone-300">{p.description}</p>
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </main>
  );
}
