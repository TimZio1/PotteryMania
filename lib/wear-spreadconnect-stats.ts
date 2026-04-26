import { prisma } from "@/lib/db";
import {
  calculateWearInternalListCents,
  useInternalWearPricing,
  wearEffectiveCostCents,
} from "@/lib/wear-internal-pricing";

export type WearCatalogValueSnapshot = {
  /** All wear products (active + inactive + archived). */
  totalProducts: number;
  /** Active, non-archived. */
  activeProducts: number;
  /** Spreadconnect-linked products (have an `externalFulfillmentId` or `spreadconnectArticleId`). */
  spreadconnectLinkedProducts: number;
  /** Active variants across all products (incl. archived). */
  totalVariants: number;
  /** Sum across active+non-archived: list price * 1 unit per variant (or product when no variant). */
  totalCatalogValueCents: number;
  /** Sum across active+non-archived: supply (COGS) cost * 1 unit per variant (or product when no variant). */
  totalCatalogCostCents: number;
  /** Estimated platform margin: catalog value − catalog cost. */
  totalCatalogMarginCents: number;
  currency: string;
  /** Whether internal pricing engine drove the figures (otherwise DB list prices). */
  usingInternalPricing: boolean;
};

type ProductRow = {
  priceCents: number;
  currency: string;
  isActive: boolean;
  archivedAt: Date | null;
  supplyCostCents: number | null;
  spreadconnectProductTypeName: string | null;
  spreadconnectCategoryData: unknown;
  externalFulfillmentId: string | null;
  spreadconnectArticleId: number | null;
  variants: { priceCents: number | null; isActive: boolean }[];
};

function unitPriceCents(p: ProductRow, internalPricing: boolean): number {
  if (internalPricing) {
    return calculateWearInternalListCents({
      supplyCostCents: p.supplyCostCents,
      spreadconnectProductTypeName: p.spreadconnectProductTypeName,
      spreadconnectCategoryData: p.spreadconnectCategoryData,
    });
  }
  return p.priceCents;
}

function unitCostCents(p: ProductRow, internalPricing: boolean): number {
  if (internalPricing) {
    return wearEffectiveCostCents({
      supplyCostCents: p.supplyCostCents,
      spreadconnectProductTypeName: p.spreadconnectProductTypeName,
      spreadconnectCategoryData: p.spreadconnectCategoryData,
    });
  }
  return p.supplyCostCents ?? 0;
}

function isLinked(p: ProductRow): boolean {
  return Boolean(p.externalFulfillmentId || p.spreadconnectArticleId);
}

/**
 * Sum of `unit price` and `unit cost` across the live catalog.
 *
 * "Catalog value" = the list price you'd see if **one** of every saleable variant (or
 * standalone product) sold once. It is intentionally **not** scaled by stock, because most
 * wear products are POD with `stockQuantity = null`.
 */
export async function loadWearCatalogValueSnapshot(): Promise<WearCatalogValueSnapshot> {
  const products = await prisma.wearProduct.findMany({
    select: {
      priceCents: true,
      currency: true,
      isActive: true,
      archivedAt: true,
      supplyCostCents: true,
      spreadconnectProductTypeName: true,
      spreadconnectCategoryData: true,
      externalFulfillmentId: true,
      spreadconnectArticleId: true,
      variants: {
        select: { priceCents: true, isActive: true },
      },
    },
  });

  const internalPricing = useInternalWearPricing();
  let totalCatalogValueCents = 0;
  let totalCatalogCostCents = 0;
  let totalVariants = 0;
  let totalProducts = products.length;
  let activeProducts = 0;
  let spreadconnectLinkedProducts = 0;
  let currency = "EUR";

  for (const p of products) {
    if (p.currency) currency = p.currency.toUpperCase();
    const isLive = p.isActive && p.archivedAt == null;
    if (isLive) activeProducts += 1;
    if (isLinked(p)) spreadconnectLinkedProducts += 1;

    const activeVariantPrices = p.variants.filter((v) => v.isActive);
    totalVariants += activeVariantPrices.length;

    if (!isLive) continue;

    const computedUnit = unitPriceCents(p, internalPricing);
    const cost = unitCostCents(p, internalPricing);

    if (activeVariantPrices.length === 0) {
      totalCatalogValueCents += computedUnit;
      totalCatalogCostCents += cost;
      continue;
    }

    for (const v of activeVariantPrices) {
      const unit = internalPricing
        ? computedUnit
        : (v.priceCents ?? p.priceCents);
      totalCatalogValueCents += unit;
      totalCatalogCostCents += cost;
    }
  }

  return {
    totalProducts,
    activeProducts,
    spreadconnectLinkedProducts,
    totalVariants,
    totalCatalogValueCents,
    totalCatalogCostCents,
    totalCatalogMarginCents: Math.max(0, totalCatalogValueCents - totalCatalogCostCents),
    currency,
    usingInternalPricing: internalPricing,
  };
}
