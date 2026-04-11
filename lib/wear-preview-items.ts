import { prisma } from "@/lib/db";
import type { WearPreviewItem } from "@/lib/wear-config";
import { wearImagesFromJson } from "@/lib/wear-product-json";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80";

function firstImageUrl(images: unknown): string | null {
  return wearImagesFromJson(images ?? null).at(0)?.url ?? null;
}

/**
 * Featured + active wear products for `/wear` preview (falls back to static list when empty).
 */
export async function getWearPreviewItemsFromDb(): Promise<WearPreviewItem[]> {
  try {
    const rows = await prisma.wearProduct.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      take: 4,
      select: {
        id: true,
        slug: true,
        name: true,
        priceCents: true,
        currency: true,
        images: true,
      },
    });

    return rows.map((p) => {
      const img = firstImageUrl(p.images) ?? PLACEHOLDER_IMG;
      const sym = p.currency === "EUR" ? "€" : p.currency === "USD" ? "$" : `${p.currency} `;
      const priceLabel = `from ${sym}${(p.priceCents / 100).toFixed(0)}`;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        priceLabel,
        imageSrc: img,
        imageAlt: p.name,
      };
    });
  } catch {
    return [];
  }
}
