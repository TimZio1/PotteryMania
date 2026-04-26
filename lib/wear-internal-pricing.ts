/**
 * Platform-controlled apparel pricing. Spreadconnect list prices are not used when internal pricing is on.
 *
 * retail = baseCost + ruleMargin (fixed EUR add-on per category)
 * baseCost = product.supplyCostCents ?? fallbackCosts[category]
 */

import { wearApparelBucketFromProduct } from "@/lib/wear-apparel-scope";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";
import { prisma } from "@/lib/db";

export type WearInternalCategory = "tshirt" | "hoodie";

const ADMIN_KEY_WEAR_INTERNAL_PRICING = "wear_internal_pricing_v1";

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

export type WearInternalPricingConfig = {
  fallbackCostsEur: Record<WearInternalCategory, number>;
  rules: Record<WearInternalCategory, WearInternalPricingRule>;
};

export const DEFAULT_WEAR_INTERNAL_PRICING_CONFIG: WearInternalPricingConfig = {
  fallbackCostsEur: WEAR_INTERNAL_FALLBACK_COSTS_EUR,
  rules: WEAR_INTERNAL_PRICING_RULES,
};

function eurToCents(eur: number): number {
  return Math.max(0, Math.round(eur * 100));
}

function parseEur(raw: unknown, fallback: number) {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return Math.round(raw * 100) / 100;
  if (typeof raw === "string") {
    const n = Number(raw.trim().replace(",", "."));
    if (Number.isFinite(n) && n >= 0) return Math.round(n * 100) / 100;
  }
  return fallback;
}

function parseRule(raw: unknown, fallback: WearInternalPricingRule): WearInternalPricingRule {
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;
  if (obj.type === "percent") {
    const value = parseEur(obj.value, fallback.type === "percent" ? fallback.value : 0);
    return { type: "percent", value };
  }
  return { type: "fixed", valueEur: parseEur(obj.valueEur, fallback.type === "fixed" ? fallback.valueEur : 0) };
}

function parseConfig(raw: unknown): WearInternalPricingConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_WEAR_INTERNAL_PRICING_CONFIG;
  const obj = raw as Record<string, unknown>;
  const fallbackCosts = (obj.fallbackCostsEur ?? {}) as Record<string, unknown>;
  const rules = (obj.rules ?? {}) as Record<string, unknown>;

  return {
    fallbackCostsEur: {
      tshirt: parseEur(fallbackCosts.tshirt, WEAR_INTERNAL_FALLBACK_COSTS_EUR.tshirt),
      hoodie: parseEur(fallbackCosts.hoodie, WEAR_INTERNAL_FALLBACK_COSTS_EUR.hoodie),
    },
    rules: {
      tshirt: parseRule(rules.tshirt, WEAR_INTERNAL_PRICING_RULES.tshirt),
      hoodie: parseRule(rules.hoodie, WEAR_INTERNAL_PRICING_RULES.hoodie),
    },
  };
}

export async function resolveWearInternalPricingConfig(): Promise<WearInternalPricingConfig> {
  try {
    const row = await prisma.adminConfig.findUnique({
      where: { configKey: ADMIN_KEY_WEAR_INTERNAL_PRICING },
      select: { configValue: true },
    });
    return parseConfig(row?.configValue);
  } catch {
    return DEFAULT_WEAR_INTERNAL_PRICING_CONFIG;
  }
}

export async function saveWearInternalPricingConfig(config: WearInternalPricingConfig) {
  const clean = parseConfig(config);
  await prisma.adminConfig.upsert({
    where: { configKey: ADMIN_KEY_WEAR_INTERNAL_PRICING },
    create: { configKey: ADMIN_KEY_WEAR_INTERNAL_PRICING, configValue: clean },
    update: { configValue: clean },
  });
  return clean;
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
  const raw = process.env.NEXT_PUBLIC_INTERNAL_WEAR_PRICING?.trim().toLowerCase();
  return raw !== "false" && raw !== "0";
}

/**
 * List price (pre–affiliate markup) in cents — what the platform charges before partner margin.
 */
export function calculateWearInternalListCents(args: {
  supplyCostCents: number | null | undefined;
  spreadconnectProductTypeName?: string | null;
  spreadconnectCategoryData?: unknown;
}, config: WearInternalPricingConfig = DEFAULT_WEAR_INTERNAL_PRICING_CONFIG): number {
  const category = wearInternalCategoryFromProduct(args);
  const costCents = args.supplyCostCents ?? eurToCents(config.fallbackCostsEur[category]);
  const rule = config.rules[category];
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
}, config: WearInternalPricingConfig = DEFAULT_WEAR_INTERNAL_PRICING_CONFIG): number {
  const category = wearInternalCategoryFromProduct(args);
  return args.supplyCostCents ?? eurToCents(config.fallbackCostsEur[category]);
}

export function assertWearUnitNotBelowCost(args: {
  unitPriceCents: number;
  supplyCostCents: number | null | undefined;
  spreadconnectProductTypeName?: string | null;
  spreadconnectCategoryData?: unknown;
}, config: WearInternalPricingConfig = DEFAULT_WEAR_INTERNAL_PRICING_CONFIG): void {
  const floor = wearEffectiveCostCents(args, config);
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
  return mapWearProductRowToInternalPricesWithConfig(row, DEFAULT_WEAR_INTERNAL_PRICING_CONFIG);
}

export function mapWearProductRowToInternalPricesWithConfig<
  T extends {
    priceCents: number;
    supplyCostCents?: number | null;
    spreadconnectProductTypeName?: string | null;
    spreadconnectCategoryData?: unknown;
    variants: Array<{ priceCents: number | null }>;
  },
>(row: T, config: WearInternalPricingConfig): T {
  if (!shouldUseInternalWearPricing()) return row;
  const list = calculateWearInternalListCents({
    supplyCostCents: row.supplyCostCents ?? null,
    spreadconnectProductTypeName: row.spreadconnectProductTypeName,
    spreadconnectCategoryData: row.spreadconnectCategoryData,
  }, config);
  return {
    ...row,
    priceCents: list,
    variants: row.variants.map((v) => ({ ...v, priceCents: list })),
  };
}
