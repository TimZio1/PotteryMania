import { prisma } from "@/lib/db";

/**
 * Promote rows that already satisfy every other public-shop rule from
 * `assetHealthStatus = "pending"` to `"ready"` so they start appearing on
 * `/wear/shop`. Keeps `wearPublicProductWhere()` as the single source of
 * truth — we only flip the one field that no other code path sets today.
 *
 * Skipped on purpose:
 * - `assetHealthStatus = "invalid"` (explicit hide, e.g. duplicate SKU)
 * - any row that still fails another filter rule
 *
 * Idempotent. Safe to re-run.
 */
export type WearAssetHealthBackfillResult = {
  promoted: number;
  scanned: number;
  stillIneligible: number;
};

export async function backfillWearAssetHealthReady(): Promise<WearAssetHealthBackfillResult> {
  const candidates = await prisma.wearProduct.findMany({
    where: {
      isActive: true,
      archivedAt: null,
      publishStatus: "published",
      assetHealthStatus: "pending",
    },
    select: {
      id: true,
      priceCents: true,
      externalFulfillmentId: true,
      variants: {
        where: { isActive: true },
        select: { priceCents: true, sku: true },
      },
    },
  });

  const eligibleIds: string[] = [];
  for (const p of candidates) {
    const productPriceOk = p.priceCents > 0;
    const variantPriceOk = p.variants.some((v) => (v.priceCents ?? 0) > 0);
    const hasPositivePrice = productPriceOk || variantPriceOk;

    const hasExternalId =
      typeof p.externalFulfillmentId === "string" && p.externalFulfillmentId.length > 0;
    const hasVariantSku = p.variants.some(
      (v) => typeof v.sku === "string" && v.sku.length > 0,
    );
    const hasFulfillableIdentity = hasExternalId || hasVariantSku;

    if (hasPositivePrice && hasFulfillableIdentity) {
      eligibleIds.push(p.id);
    }
  }

  let promoted = 0;
  if (eligibleIds.length > 0) {
    const res = await prisma.wearProduct.updateMany({
      where: { id: { in: eligibleIds }, assetHealthStatus: "pending" },
      data: { assetHealthStatus: "ready" },
    });
    promoted = res.count;
  }

  return {
    promoted,
    scanned: candidates.length,
    stillIneligible: candidates.length - eligibleIds.length,
  };
}
