import { NextResponse } from "next/server";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";
import {
  resolveWearCatalogCategory,
  isWearTopSubcategory,
  wearTopSubcategoryLabel,
} from "@/lib/wear-categories";
import { findWearPublicProductsWithVariantsRetrying } from "@/lib/wear-public-catalog-query";
import { mapWearProductRowToInternalPrices } from "@/lib/wear-internal-pricing";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryFilter = url.searchParams.get("category")?.trim().toLowerCase() ?? "";
  const subParam = url.searchParams.get("sub")?.trim().toLowerCase() ?? "";
  const topSubFilter = isWearTopSubcategory(subParam) ? subParam : null;

  try {
    const result = await findWearPublicProductsWithVariantsRetrying();
    if (!result.ok) {
      throw result.error instanceof Error ? result.error : new Error("wear catalog query failed");
    }
    const rows = result.rows;

    const products = rows
      .map((raw) => mapWearProductRowToInternalPrices(raw))
      .map((r) => {
        const category = resolveWearCatalogCategory({
          slug: r.slug,
          name: r.name,
          subtitle: r.subtitle,
          description: r.description,
          spreadconnectProductTypeName: r.spreadconnectProductTypeName,
          spreadconnectCategoryData: r.spreadconnectCategoryData,
        });
        const topSub = category.topSub;
        return {
          id: r.id,
          slug: r.slug,
          name: r.name,
          subtitle: r.subtitle,
          description: r.description,
          category: category.categorySlug,
          categoryLabel: category.categoryLabel,
          fallbackCategory: category.fallbackCategory,
          categorySource: category.source,
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
  } catch (e) {
    console.warn("[GET /api/wear/products]", e);
    return NextResponse.json(
      { products: [], error: "wear_catalog_unavailable" },
      { status: 503 },
    );
  }
}
