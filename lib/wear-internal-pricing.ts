/**
 * Platform-controlled apparel pricing. Spreadconnect list prices are not used when internal pricing is on.
 *
 * retail = baseCost + ruleMargin (fixed EUR add-on per category)
 * baseCost = product.supplyCostCents ?? fallbackCosts[category]
 */

import { wearApparelBucketFromProduct } from "@/lib/wear-apparel-scope";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";

export type WearInternalCategory = "tshirt" | "hoodie";

/** Fallback COGS in EUR when `supplyCostCents` is unset. */
export const WEAR_INTERNAL_FALLBACK_COSTS_EUR: Record<WearInternalCategory, number> = {
  tshirt: 10,
  hoodie: 18,
};

export type WearInternalPricingRule =
  | { type: "fixed"; valueEur: number }
  | { type: "percent"; value: number };

export const WEAR_INTERNAL_PRICING_RULES: Record<WearInternalCategory, WearInternalPricingRule> = {
  tshirt: { type: "fixed", valueEur: 10 },
  hoodie: { type: "fixed", valueEur: 15 },
};

function eurToCents(eur: number): number {
  return Math.max(0, Math.round(eur * 100));
}

export function wearInternalCategoryFromProduct(fields: {
  spreadconnectProductTypeName?: string | null;
  spreadconnectCategoryData?: unknown;
}): WearInternalCategory {
  const bucket = wearApparelBucketFromProduct(fields);
  if (bucket === "hoodies") return "hoodie";
  return "tshirt";
}

export function shouldUseInternalWearPricing(): boolean {
  if (isApparelOnlyLaunch()) return true;
  return process.env.NEXT_PUBLIC_INTERNAL_WEAR_PRICING?.trim().toLowerCase() === "true";
}

/**
 * List price (pre–affiliate markup) in cents — what the platform charges before partner margin.
 */
export function calculateWearInternalListCents(args: {
  supplyCostCents: number | null | undefined;
  spreadconnectProductTypeName?: string | null;
  spreadconnectCategoryData?: unknown;
}): number {
  const category = wearInternalCategoryFromProduct(args);
  const costCents = args.supplyCostCents ?? eurToCents(WEAR_INTERNAL_FALLBACK_COSTS_EUR[category]);
  const rule = WEAR_INTERNAL_PRICING_RULES[category];
  if (rule.type === "fixed") {
    return costCents + eurToCents(rule.valueEur);
  }
  return costCents + Math.round((costCents * rule.value) / 100);
}

/** Enforce paid unit ≥ COGS (supply or fallback cost for category). */
export function wearEffectiveCostCents(args: {
  supplyCostCents: number | null | undefined;
  spreadconnectProductTypeName?: string | null;
  spreadconnectCategoryData?: unknown;
}): number {
  const category = wearInternalCategoryFromProduct(args);
  return args.supplyCostCents ?? eurToCents(WEAR_INTERNAL_FALLBACK_COSTS_EUR[category]);
}

export function assertWearUnitNotBelowCost(args: {
  unitPriceCents: number;
  supplyCostCents: number | null | undefined;
  spreadconnectProductTypeName?: string | null;
  spreadconnectCategoryData?: unknown;
}): void {
  const floor = wearEffectiveCostCents(args);
  if (args.unitPriceCents < floor) {
    throw new Error("WEAR_PRICE_BELOW_COST");
  }
}

/** Replace DB / Spreadconnect list prices with platform rules (product + all variants). */
export function mapWearProductRowToInternalPrices<
  T extends {
    priceCents: number;
    supplyCostCents?: number | null;
    spreadconnectProductTypeName?: string | null;
    spreadconnectCategoryData?: unknown;
    variants: Array<{ priceCents: number | null }>;
  },
>(row: T): T {
  if (!shouldUseInternalWearPricing()) return row;
  const list = calculateWearInternalListCents({
    supplyCostCents: row.supplyCostCents ?? null,
    spreadconnectProductTypeName: row.spreadconnectProductTypeName,
    spreadconnectCategoryData: row.spreadconnectCategoryData,
  });
  return {
    ...row,
    priceCents: list,
    variants: row.variants.map((v) => ({ ...v, priceCents: list })),
  };
}
