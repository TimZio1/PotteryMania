import { prisma } from "@/lib/db";
import { calculateWearPrice, resolveStudioMarginBps, resolveWearGlobalPricing } from "@/lib/wear-commission";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";

export type StudioWearItem = {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  priceCents: number;
  image: string | null;
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
    },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    subtitle: p.subtitle,
    priceCents: calculateWearPrice(p.priceCents, effectiveMarginBps),
    image: wearImageUrlsFromJson(p.images)[0] ?? null,
  }));
}
