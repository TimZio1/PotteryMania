import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";
import {
  isWearCategory,
  isWearTopSubcategory,
  resolveWearCategory,
  resolveWearTopSubcategory,
  wearCategoryLabel,
  wearTopSubcategoryLabel,
} from "@/lib/wear-categories";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryParam = url.searchParams.get("category")?.trim().toLowerCase() ?? "";
  const categoryFilter = isWearCategory(categoryParam) ? categoryParam : null;
  const subParam = url.searchParams.get("sub")?.trim().toLowerCase() ?? "";
  const topSubFilter =
    categoryFilter === "tops" && isWearTopSubcategory(subParam) ? subParam : null;

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

  const products = rows
    .map((r) => {
      const category = resolveWearCategory({
        slug: r.slug,
        name: r.name,
        subtitle: r.subtitle,
        description: r.description,
      });
      const topSub = category === "tops" ? resolveWearTopSubcategory({
        slug: r.slug,
        name: r.name,
        subtitle: r.subtitle,
        description: r.description,
      }) : null;
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        subtitle: r.subtitle,
        description: r.description,
        category,
        categoryLabel: wearCategoryLabel(category),
        topSub,
        topSubLabel: topSub ? wearTopSubcategoryLabel(topSub) : null,
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
      };
    })
    .filter((r) => !categoryFilter || r.category === categoryFilter)
    .filter((r) => !topSubFilter || r.topSub === topSubFilter);

  return NextResponse.json({ products });
}
