import type { Prisma } from "@prisma/client";

/**
 * Single source of truth for “may appear on public shop, APIs, checkout, sitemap, studio resale”.
 *
 * Rules (all required):
 * - active, not archived
 * - publishStatus published, assetHealthStatus ready
 * - positive sellable unit price (product or at least one active variant)
 * - fulfillable Spreadconnect identity: product-level external fulfillment SKU **or** ≥1 active variant with non-empty sku
 *
 * Admin lists may use broader queries; never bypass this for customer-facing paths.
 */
export function wearPublicProductWhere(): Prisma.WearProductWhereInput {
  return {
    isActive: true,
    archivedAt: null,
    publishStatus: "published",
    assetHealthStatus: "ready",
    AND: [
      {
        OR: [{ priceCents: { gt: 0 } }, { variants: { some: { isActive: true, priceCents: { gt: 0 } } } }],
      },
      {
        OR: [
          {
            AND: [{ externalFulfillmentId: { not: null } }, { NOT: { externalFulfillmentId: "" } }],
          },
          {
            variants: {
              some: {
                isActive: true,
                sku: { not: null },
                NOT: { sku: "" },
              },
            },
          },
        ],
      },
    ],
  };
}
