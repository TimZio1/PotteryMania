import { prisma } from "@/lib/db";
import { calculateWearPrice, resolveStudioMarginBps, resolveWearGlobalPricing } from "@/lib/wear-commission";
import {
  mapWearProductRowToInternalPricesWithConfig,
  resolveWearInternalPricingConfig,
  shouldUseInternalWearPricing,
} from "@/lib/wear-internal-pricing";
import { resolveWearCatalogCategory, wearTopSubcategoryLabel } from "@/lib/wear-categories";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";
import { wearPublicProductWhere } from "@/lib/wear-public-filter";

export type StudioWearItem = {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  priceCents: number;
  image: string | null;
  categoryLabel: string;
  topSubLabel: string | null;
};

export async function getStudioWearProducts(studioId: string): Promise<StudioWearItem[] | null> {
  const config = await prisma.studioWearConfig.findUnique({
    where: { studioId },
    select: { enabled: true, marginBps: true },
  });
  if (!config?.enabled) return null;

  const selections = await prisma.studioWearProduct.findMany({
    where: { studioId },
    orderBy: { sortOrder: "asc" },
    select: { wearProductId: true },
  });
  if (selections.length === 0) return null;

  const global = await resolveWearGlobalPricing();
  const effectiveMarginBps = resolveStudioMarginBps(config.marginBps, global);
  const internalCfg = shouldUseInternalWearPricing() ? await resolveWearInternalPricingConfig() : null;

  const products = await prisma.wearProduct.findMany({
    where: {
      id: { in: selections.map((s) => s.wearProductId) },
      ...wearPublicProductWhere(),
    },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      variants: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      },
    },
  });

  return products.map((p) => {
    const row = internalCfg ? mapWearProductRowToInternalPricesWithConfig(p, internalCfg) : p;
    const category = resolveWearCatalogCategory({
      slug: p.slug,
      name: p.name,
      subtitle: p.subtitle,
      description: p.description,
      spreadconnectProductTypeName: p.spreadconnectProductTypeName,
      spreadconnectCategoryData: p.spreadconnectCategoryData,
    });
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      subtitle: p.subtitle,
      priceCents: internalCfg ? row.priceCents : calculateWearPrice(p.priceCents, effectiveMarginBps),
      image: wearImageUrlsFromJson(p.images)[0] ?? null,
      categoryLabel: category.categoryLabel,
      topSubLabel: category.topSub ? wearTopSubcategoryLabel(category.topSub) : null,
    };
  });
}
