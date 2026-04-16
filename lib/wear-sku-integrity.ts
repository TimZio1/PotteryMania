import { prisma } from "@/lib/db";

export type WearSkuDuplicateRow = {
  sku: string;
  variantCount: number;
  wearProductIds: string[];
};

/**
 * Active variants only. Empty / null SKUs ignored.
 * Used by admin health and optional cron — duplicate SKUs risk ambiguous fulfillment routing.
 */
export async function findDuplicateWearVariantSkus(): Promise<WearSkuDuplicateRow[]> {
  const rows = await prisma.wearProductVariant.findMany({
    where: { isActive: true, sku: { not: null }, NOT: { sku: "" } },
    select: { sku: true, wearProductId: true },
  });

  const bySku = new Map<string, { productIds: Set<string>; variantCount: number }>();
  for (const r of rows) {
    const s = r.sku?.trim();
    if (!s) continue;
    let e = bySku.get(s);
    if (!e) {
      e = { productIds: new Set<string>(), variantCount: 0 };
      bySku.set(s, e);
    }
    e.productIds.add(r.wearProductId);
    e.variantCount += 1;
  }

  const dupes: WearSkuDuplicateRow[] = [];
  for (const [sku, { productIds, variantCount }] of bySku) {
    if (productIds.size <= 1) continue;
    dupes.push({
      sku,
      variantCount,
      wearProductIds: [...productIds],
    });
  }
  return dupes.sort((a, b) => b.variantCount - a.variantCount);
}
