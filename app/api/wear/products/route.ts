import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";

export async function GET() {
  const rows = await prisma.wearProduct.findMany({
    where: { isActive: true, archivedAt: null },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      variants: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      },
    },
  });

  const products = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    subtitle: r.subtitle,
    description: r.description,
    priceCents: r.priceCents,
    currency: r.currency,
    images: wearImageUrlsFromJson(r.images),
    sortOrder: r.sortOrder,
    isFeatured: r.isFeatured,
    variants: r.variants.map((v) => ({
      id: v.id,
      label: v.label,
      optionSize: v.optionSize,
      optionColor: v.optionColor,
      sku: v.sku,
      priceCents: v.priceCents,
      stockQuantity: v.stockQuantity,
    })),
  }));

  return NextResponse.json({ products });
}
