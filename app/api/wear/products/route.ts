import { NextResponse } from "next/server";
import { sortWearCatalogImagesForDisplay, wearImageUrlsFromJson, wearImagesFromJson } from "@/lib/wear-product-json";
import {
  resolveWearCatalogCategory,
  isWearTopSubcategory,
  wearTopSubcategoryLabel,
} from "@/lib/wear-categories";
import { findWearPublicProductsWithVariantsRetrying } from "@/lib/wear-public-catalog-query";
import { resolveWearGlobalPricing, wearPublicRetailUnitCents } from "@/lib/wear-commission";
import {
  mapWearProductRowToInternalPricesWithConfig,
  resolveWearInternalPricingConfig,
  shouldUseInternalWearPricing,
} from "@/lib/wear-internal-pricing";
import { merchantFeedOfferId } from "@/lib/meta-wear-feed";

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
    const internalPricingConfig = await resolveWearInternalPricingConfig();
    const globalPricing = await resolveWearGlobalPricing();
    const useInternal = shouldUseInternalWearPricing();

    const products = rows
      .map((raw) => mapWearProductRowToInternalPricesWithConfig(raw, internalPricingConfig))
      .map((r) => {
        const unitRetail = wearPublicRetailUnitCents(
          r.priceCents,
          globalPricing.defaultMarginBps,
          useInternal,
        );
        const category = resolveWearCatalogCategory({
          slug: r.slug,
          name: r.name,
          subtitle: r.subtitle,
          description: r.description,
          spreadconnectProductTypeName: r.spreadconnectProductTypeName,
          spreadconnectCategoryData: r.spreadconnectCategoryData,
        });
        const topSub = category.topSub;
        const catalogImages = sortWearCatalogImagesForDisplay(wearImagesFromJson(r.images));
        return {
          id: r.id,
          metaContentId: merchantFeedOfferId(r.id),
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
          priceCents: unitRetail,
          currency: r.currency,
          images: wearImageUrlsFromJson(r.images),
          catalogImages: catalogImages.map((img) => ({
            url: img.url,
            appearanceName: img.appearanceName,
            perspective: img.perspective,
          })),
          sortOrder: r.sortOrder,
          isFeatured: r.isFeatured,
          variants: r.variants.map((v) => ({
            id: v.id,
            metaContentId: merchantFeedOfferId(r.id, v.id),
            label: v.label,
            optionSize: v.optionSize,
            optionColor: v.optionColor,
            sku: v.sku,
            priceCents: unitRetail,
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
