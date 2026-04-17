import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { wearPublicProductWhere } from "@/lib/wear-public-filter";

/** Typed include so `findMany` results include `variants` (avoids `as const` breaking Prisma inference). */
const WEAR_LISTING_INCLUDE: Prisma.WearProductInclude = {
  variants: {
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  },
};

/** Public wear products for shop + `/api/wear/products` (same filter + shape as storefront). */
export async function findWearPublicProductsWithVariants() {
  return prisma.wearProduct.findMany({
    where: wearPublicProductWhere(),
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: WEAR_LISTING_INCLUDE,
  });
}

export type WearPublicListingRow = Awaited<ReturnType<typeof findWearPublicProductsWithVariants>>[number];

/**
 * Railway / serverless DB can fail once on cold connect or pool contention.
 * Retry a few times before surfacing “catalog unavailable” to users.
 */
const RETRY_DELAYS_MS = [150, 400, 900, 1800];

export async function findWearPublicProductsWithVariantsRetrying(maxAttempts = 5): Promise<
  { ok: true; rows: Awaited<ReturnType<typeof findWearPublicProductsWithVariants>> } | { ok: false; error: unknown }
> {
  let last: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const rows = await findWearPublicProductsWithVariants();
      return { ok: true, rows };
    } catch (e) {
      last = e;
      console.error(`[wear catalog] findMany attempt ${attempt + 1}/${maxAttempts} failed`, e);
      if (attempt < maxAttempts - 1) {
        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 300;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  return { ok: false, error: last };
}
