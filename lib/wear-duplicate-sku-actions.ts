import { prisma } from "@/lib/db";
import type { WearSkuDuplicateRow } from "@/lib/wear-sku-integrity";

const AUTO_HIDE_ENV = "WEAR_AUTO_HIDE_DUPLICATE_SKU_PRODUCTS";

/**
 * When `WEAR_AUTO_HIDE_DUPLICATE_SKU_PRODUCTS=true`, sets affected products to hidden + invalid health
 * so they cannot pass `wearPublicProductWhere()` until operators fix SKU collisions.
 */
export async function applyAutoHideForDuplicateSkuProducts(
  duplicates: WearSkuDuplicateRow[],
): Promise<{ hiddenProductCount: number } | { skipped: true; reason: string }> {
  if (duplicates.length === 0) {
    return { hiddenProductCount: 0 };
  }
  const enabled = process.env[AUTO_HIDE_ENV]?.trim() === "true";
  if (!enabled) {
    return { skipped: true, reason: `${AUTO_HIDE_ENV} is not true` };
  }

  const ids = [...new Set(duplicates.flatMap((d) => d.wearProductIds))];
  if (ids.length === 0) {
    return { hiddenProductCount: 0 };
  }

  const result = await prisma.wearProduct.updateMany({
    where: { id: { in: ids } },
    data: {
      publishStatus: "hidden",
      assetHealthStatus: "invalid",
      assetHealthMessage:
        "Auto-hidden: duplicate Spreadconnect SKU on another product. Fix variants/SKUs in admin, then re-publish.",
    },
  });

  return { hiddenProductCount: result.count };
}
