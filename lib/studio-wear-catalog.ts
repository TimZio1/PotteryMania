import { prisma } from "@/lib/db";
import { calculateWearPrice, resolveStudioMarginBps, resolveWearGlobalPricing } from "@/lib/wear-commission";
import { resolveWearCatalogCategory, wearTopSubcategoryLabel } from "@/lib/wear-categories";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";

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

  const products = await prisma.wearProduct.findMany({
    where: {
      id: { in: selections.map((s) => s.wearProductId) },
      isActive: true,
      archivedAt: null,
    },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      subtitle: true,
      priceCents: true,
      images: true,
      description: true,
      spreadconnectProductTypeName: true,
      spreadconnectCategoryData: true,
    },
  });

  return products.map((p) => {
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
      priceCents: calculateWearPrice(p.priceCents, effectiveMarginBps),
      image: wearImageUrlsFromJson(p.images)[0] ?? null,
      categoryLabel: category.categoryLabel,
      topSubLabel: category.topSub ? wearTopSubcategoryLabel(category.topSub) : null,
    };
  });
}
