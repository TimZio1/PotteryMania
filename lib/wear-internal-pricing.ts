/**
 * Platform-controlled apparel pricing. Spreadconnect list prices are not used when internal pricing is on.
 *
 * retail = baseCost + ruleMargin (fixed EUR add-on per category)
 * baseCost = product.supplyCostCents (Spreadconnect b2bPrice)
 *
 * Important: linked Spreadconnect products must not be repriced from the manual fallback cost
 * when b2bPrice is missing. In that case we keep the saved Spreadconnect retail/list price
 * instead of accidentally selling below production cost.
 */

import { isApparelOnlyLaunch } from "@/lib/launch-mode";
import { prisma } from "@/lib/db";
import { WEAR_CATEGORIES, resolveWearCategory, type WearCategory } from "@/lib/wear-categories";

const ADMIN_KEY_WEAR_INTERNAL_PRICING = "wear_internal_pricing_v1";

/** Shop-aligned buckets — rules apply per inferred category (slug, name, Spreadconnect hints). */
export type WearInternalPricingCategory = WearCategory;

/** Fallback COGS in EUR when `supplyCostCents` is unset. */
export const WEAR_INTERNAL_FALLBACK_COSTS_EUR: Record<WearCategory, number> = {
  tops: 10,
  hoodies: 18,
  headwear: 6,
  accessories: 8,
  other: 12,
};

export type WearInternalPricingRule =
  | { type: "fixed"; valueEur: number }
  | { type: "percent"; value: number };

export const WEAR_INTERNAL_PRICING_RULES: Record<WearCategory, WearInternalPricingRule> = {
  tops: { type: "fixed", valueEur: 10 },
  hoodies: { type: "fixed", valueEur: 15 },
  headwear: { type: "fixed", valueEur: 8 },
  accessories: { type: "fixed", valueEur: 10 },
  other: { type: "fixed", valueEur: 10 },
};

export type WearInternalPricingConfig = {
  fallbackCostsEur: Record<WearCategory, number>;
  rules: Record<WearCategory, WearInternalPricingRule>;
};

export const DEFAULT_WEAR_INTERNAL_PRICING_CONFIG: WearInternalPricingConfig = {
  fallbackCostsEur: { ...WEAR_INTERNAL_FALLBACK_COSTS_EUR },
  rules: { ...WEAR_INTERNAL_PRICING_RULES },
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
  const defaults = DEFAULT_WEAR_INTERNAL_PRICING_CONFIG;
  if (!raw || typeof raw !== "object") return defaults;

  const obj = raw as Record<string, unknown>;
  const fallbackCosts = (obj.fallbackCostsEur ?? {}) as Record<string, unknown>;
  const rulesObj = (obj.rules ?? {}) as Record<string, unknown>;

  const outFallbacks = { ...defaults.fallbackCostsEur };
  const outRules = { ...defaults.rules };

  /** Legacy v1 keys (`tshirt` / `hoodie`) map to shop categories `tops` / `hoodies`. */
  if (fallbackCosts.tshirt != null) {
    outFallbacks.tops = parseEur(fallbackCosts.tshirt, outFallbacks.tops);
  }
  if (fallbackCosts.hoodie != null) {
    outFallbacks.hoodies = parseEur(fallbackCosts.hoodie, outFallbacks.hoodies);
  }
  if (rulesObj.tshirt != null) {
    outRules.tops = parseRule(rulesObj.tshirt, outRules.tops);
  }
  if (rulesObj.hoodie != null) {
    outRules.hoodies = parseRule(rulesObj.hoodie, outRules.hoodies);
  }

  for (const cat of WEAR_CATEGORIES) {
    if (fallbackCosts[cat] != null) {
      outFallbacks[cat] = parseEur(fallbackCosts[cat], outFallbacks[cat]);
    }
    if (rulesObj[cat] != null) {
      outRules[cat] = parseRule(rulesObj[cat], outRules[cat]);
    }
  }

  return { fallbackCostsEur: outFallbacks, rules: outRules };
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

export type WearInternalCategoryInput = {
  slug?: string | null;
  name?: string | null;
  subtitle?: string | null;
  description?: string | null;
  spreadconnectProductTypeName?: string | null;
  spreadconnectCategoryData?: unknown;
};

export function wearInternalCategoryFromProduct(fields: WearInternalCategoryInput): WearCategory {
  return resolveWearCategory(fields);
}

export function shouldUseInternalWearPricing(): boolean {
  if (isApparelOnlyLaunch()) return true;
  const raw = process.env.NEXT_PUBLIC_INTERNAL_WEAR_PRICING?.trim().toLowerCase();
  return raw !== "false" && raw !== "0";
}

type WearInternalListArgs = WearInternalCategoryInput & {
  priceCents?: number | null;
  supplyCostCents: number | null | undefined;
  externalFulfillmentId?: string | null;
  spreadconnectArticleId?: number | null;
  /** When set with positive `supplyCostCents`, list = COGS × (1 + percent/100), ignoring category rules. */
  internalMarkupPercent?: number | null;
};

/**
 * List price (pre–affiliate markup) in cents — what the platform charges before partner margin.
 */
export function calculateWearInternalListCents(
  args: WearInternalListArgs,
  config: WearInternalPricingConfig = DEFAULT_WEAR_INTERNAL_PRICING_CONFIG,
): number {
  const linkedToSpreadconnect = Boolean(args.externalFulfillmentId || args.spreadconnectArticleId);
  if (args.supplyCostCents == null && linkedToSpreadconnect && typeof args.priceCents === "number" && args.priceCents > 0) {
    return args.priceCents;
  }
  const markup = args.internalMarkupPercent;
  if (
    markup != null &&
    Number.isFinite(markup) &&
    typeof args.supplyCostCents === "number" &&
    args.supplyCostCents > 0
  ) {
    return Math.max(0, Math.round(args.supplyCostCents * (1 + markup / 100)));
  }
  const category = wearInternalCategoryFromProduct(args);
  const costCents = args.supplyCostCents ?? eurToCents(config.fallbackCostsEur[category]);
  const rule = config.rules[category];
  if (rule.type === "fixed") {
    return costCents + eurToCents(rule.valueEur);
  }
  return costCents + Math.round((costCents * rule.value) / 100);
}

/** Enforce paid unit ≥ COGS (supply or fallback cost for category). */
export function wearEffectiveCostCents(
  args: WearInternalListArgs,
  config: WearInternalPricingConfig = DEFAULT_WEAR_INTERNAL_PRICING_CONFIG,
): number {
  const linkedToSpreadconnect = Boolean(args.externalFulfillmentId || args.spreadconnectArticleId);
  if (args.supplyCostCents == null && linkedToSpreadconnect && typeof args.priceCents === "number" && args.priceCents > 0) {
    return args.priceCents;
  }
  const markup = args.internalMarkupPercent;
  if (
    markup != null &&
    Number.isFinite(markup) &&
    typeof args.supplyCostCents === "number" &&
    args.supplyCostCents > 0
  ) {
    return args.supplyCostCents;
  }
  const category = wearInternalCategoryFromProduct(args);
  return args.supplyCostCents ?? eurToCents(config.fallbackCostsEur[category]);
}

export function assertWearUnitNotBelowCost(
  args: WearInternalListArgs & { unitPriceCents: number },
  config: WearInternalPricingConfig = DEFAULT_WEAR_INTERNAL_PRICING_CONFIG,
): void {
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
    internalMarkupPercent?: number | null;
    slug?: string | null;
    name?: string | null;
    subtitle?: string | null;
    description?: string | null;
    externalFulfillmentId?: string | null;
    spreadconnectArticleId?: number | null;
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
    internalMarkupPercent?: number | null;
    slug?: string | null;
    name?: string | null;
    subtitle?: string | null;
    description?: string | null;
    externalFulfillmentId?: string | null;
    spreadconnectArticleId?: number | null;
    spreadconnectProductTypeName?: string | null;
    spreadconnectCategoryData?: unknown;
    variants: Array<{ priceCents: number | null }>;
  },
>(row: T, config: WearInternalPricingConfig): T {
  if (!shouldUseInternalWearPricing()) return row;
  const list = calculateWearInternalListCents(
    {
      slug: row.slug,
      name: row.name,
      subtitle: row.subtitle,
      description: row.description,
      priceCents: row.priceCents,
      supplyCostCents: row.supplyCostCents ?? null,
      internalMarkupPercent: row.internalMarkupPercent ?? null,
      externalFulfillmentId: row.externalFulfillmentId,
      spreadconnectArticleId: row.spreadconnectArticleId,
      spreadconnectProductTypeName: row.spreadconnectProductTypeName,
      spreadconnectCategoryData: row.spreadconnectCategoryData,
    },
    config,
  );
  return {
    ...row,
    priceCents: list,
    variants: row.variants.map((v) => ({ ...v, priceCents: list })),
  };
}
