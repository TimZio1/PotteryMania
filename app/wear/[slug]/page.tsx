import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import {
  resolveWearCatalogCategory,
  wearTopSubcategoryLabel,
} from "@/lib/wear-categories";
import { wearImagesFromJson } from "@/lib/wear-product-json";
import { WearProductGallery } from "@/components/wear/wear-product-gallery";

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
  const category = resolveWearCatalogCategory({
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    spreadconnectProductTypeName: p.spreadconnectProductTypeName,
    spreadconnectCategoryData: p.spreadconnectCategoryData,
  });
  const images = wearImagesFromJson(p.images).map((image, index) => ({
    id: String(image.imageId ?? `${index}-${image.url}`),
    url: image.url,
    appearanceName: image.appearanceName,
    perspective: image.perspective,
  }));

  const variantProps = p.variants.map((v) => ({
    id: v.id,
    label: v.label,
    priceCents: v.priceCents,
    stockQuantity: v.stockQuantity,
  }));

  return (
    <main className="bg-[#f7f2ec] px-4 py-12 text-(--brand-ink) sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_22px_80px_-32px_rgba(120,77,42,0.18)] sm:p-7 lg:p-8">
        <WearProductGallery
          productId={p.id}
          productName={p.name}
          images={images}
          variants={variantProps}
          basePriceCents={p.priceCents}
          currency={p.currency}
          backHref={`/wear/shop${category.categorySlug ? `?category=${category.categorySlug}` : ""}${
            category.topSub ? `&sub=${category.topSub}` : ""
          }`}
          categoryLabel={category.categoryLabel}
          topSubLabel={category.topSub ? wearTopSubcategoryLabel(category.topSub) : null}
          subtitle={p.subtitle}
          description={p.description}
        />
      </div>
    </main>
  );
}
