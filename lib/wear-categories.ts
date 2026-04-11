import { normalizeWearSlug } from "@/lib/wear-slug";

export const WEAR_CATEGORIES = ["tops", "hoodies", "headwear", "accessories", "other"] as const;

export type WearCategory = (typeof WEAR_CATEGORIES)[number];

/** Inferred from copy when `resolveWearCategory` is `tops` (tees, polos, tanks, etc.). */
export const WEAR_TOP_SUBCATEGORIES = ["short_sleeve", "long_sleeve", "tank", "polo", "other"] as const;

export type WearTopSubcategory = (typeof WEAR_TOP_SUBCATEGORIES)[number];

export type WearProviderCategorySummary = {
  slug: string;
  label: string;
  path: string[];
};

export type WearCatalogCategorySummary = {
  categorySlug: string;
  categoryLabel: string;
  source: "spreadconnect" | "fallback";
  fallbackCategory: WearCategory;
  topSub: WearTopSubcategory | null;
  providerCategory: WearProviderCategorySummary | null;
};

export const WEAR_CATEGORY_LABELS: Record<WearCategory, string> = {
  tops: "Tops",
  hoodies: "Hoodies & Sweatshirts",
  headwear: "Headwear",
  accessories: "Accessories",
  other: "Other",
};

export const WEAR_TOP_SUBCATEGORY_LABELS: Record<WearTopSubcategory, string> = {
  short_sleeve: "Short sleeve tees",
  long_sleeve: "Long sleeve",
  tank: "Tanks & sleeveless",
  polo: "Polos",
  other: "Other tops",
};

// Optional hard overrides when a specific slug should map to a custom category.
const WEAR_CATEGORY_OVERRIDES: Record<string, WearCategory> = {};

const CATEGORY_RULES: Array<{ category: WearCategory; keywords: RegExp[] }> = [
  {
    category: "hoodies",
    keywords: [/\bhoodie\b/i, /\bsweatshirt\b/i, /\bcrewneck\b/i, /\bzip[-\s]?hood/i],
  },
  {
    category: "headwear",
    keywords: [/\bcap\b/i, /\bhat\b/i, /\bbeanie\b/i, /\bsnapback\b/i],
  },
  {
    category: "accessories",
    keywords: [/\btote\b/i, /\bbag\b/i, /\bmug\b/i, /\bsticker\b/i, /\bpin\b/i],
  },
  {
    category: "tops",
    keywords: [/\btee\b/i, /\bt-?shirt\b/i, /\blongsleeve\b/i, /\bshirt\b/i, /\bpolo\b/i],
  },
];

type WearCategoryInput = {
  slug?: string | null;
  name?: string | null;
  subtitle?: string | null;
  description?: string | null;
  spreadconnectProductTypeName?: string | null;
  spreadconnectCategoryData?: unknown;
};

const TOP_SUB_RULES: Array<{ sub: WearTopSubcategory; keywords: RegExp[] }> = [
  {
    sub: "long_sleeve",
    keywords: [/\blongsleeve\b/i, /\blong[-\s]?sleeve\b/i, /\bls\s+tee\b/i],
  },
  {
    sub: "tank",
    keywords: [/\btank\b/i, /\bracerback\b/i, /\bsleeveless\b/i, /\bvest\b/i],
  },
  {
    sub: "polo",
    keywords: [/\bpolo\b/i, /\bgolf\s+shirt\b/i],
  },
  {
    sub: "short_sleeve",
    keywords: [/\btee\b/i, /\bt-?shirt\b/i, /\bshort[-\s]?sleeve\b/i, /\bss\s+tee\b/i, /\bshirt\b/i],
  },
];

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function categoryCorpus(input: WearCategoryInput): string {
  return [input.slug, input.name, input.subtitle, input.description, input.spreadconnectProductTypeName]
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .join(" ");
}

function walkSpreadconnectCategoryNode(node: unknown, prefix: string[]): string[][] {
  if (!isRecord(node)) return [];

  const translation = asNonEmptyString(node.translation);
  const nextPrefix = translation ? [...prefix, translation] : prefix;
  const children = Array.isArray(node.children) ? node.children : [];

  if (children.length === 0) {
    return nextPrefix.length ? [nextPrefix] : [];
  }

  const nested = children.flatMap((child) => walkSpreadconnectCategoryNode(child, nextPrefix));
  return nested.length > 0 ? nested : nextPrefix.length ? [nextPrefix] : [];
}

export function wearSpreadconnectCategoryPaths(data: unknown): string[][] {
  if (!isRecord(data) || !Array.isArray(data.categories)) return [];

  const seen = new Set<string>();
  const out: string[][] = [];

  for (const node of data.categories) {
    for (const path of walkSpreadconnectCategoryNode(node, [])) {
      const normalized = path.map((part) => part.trim()).filter(Boolean);
      if (!normalized.length) continue;
      const key = normalized.join(" > ");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(normalized);
    }
  }

  out.sort((a, b) => b.length - a.length || a.join(" ").localeCompare(b.join(" ")));
  return out;
}

export function resolveWearProviderCategory(
  input: Pick<WearCategoryInput, "spreadconnectCategoryData" | "spreadconnectProductTypeName">,
): WearProviderCategorySummary | null {
  const primaryPath = wearSpreadconnectCategoryPaths(input.spreadconnectCategoryData)[0] ?? null;
  if (primaryPath && primaryPath.length > 0) {
    const label = primaryPath[primaryPath.length - 1];
    return {
      slug: normalizeWearSlug(label) || normalizeWearSlug(primaryPath.join("-")) || "other",
      label,
      path: primaryPath,
    };
  }

  const productTypeName = input.spreadconnectProductTypeName?.trim() || "";
  if (!productTypeName) return null;

  return {
    slug: normalizeWearSlug(productTypeName) || "other",
    label: productTypeName,
    path: [productTypeName],
  };
}

export function isWearCategory(value: string | null | undefined): value is WearCategory {
  if (!value) return false;
  return (WEAR_CATEGORIES as readonly string[]).includes(value);
}

export function isWearTopSubcategory(value: string | null | undefined): value is WearTopSubcategory {
  if (!value) return false;
  return (WEAR_TOP_SUBCATEGORIES as readonly string[]).includes(value);
}

export function resolveWearCategory(input: WearCategoryInput): WearCategory {
  const slug = (input.slug ?? "").trim().toLowerCase();
  const direct = WEAR_CATEGORY_OVERRIDES[slug];
  if (direct) return direct;

  const corpus = categoryCorpus(input);

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((rx) => rx.test(corpus))) return rule.category;
  }
  return "other";
}

export function wearCategoryLabel(category: WearCategory): string {
  return WEAR_CATEGORY_LABELS[category];
}

export function wearTopSubcategoryLabel(sub: WearTopSubcategory): string {
  return WEAR_TOP_SUBCATEGORY_LABELS[sub];
}

/** Call when the resolved wear category is `tops`; still safe on any product text. */
export function resolveWearTopSubcategory(input: WearCategoryInput): WearTopSubcategory {
  const corpus = categoryCorpus(input);

  for (const rule of TOP_SUB_RULES) {
    if (rule.keywords.some((rx) => rx.test(corpus))) return rule.sub;
  }
  return "other";
}

export function resolveWearCatalogCategory(input: WearCategoryInput): WearCatalogCategorySummary {
  const fallbackCategory = resolveWearCategory(input);
  const topSub = fallbackCategory === "tops" ? resolveWearTopSubcategory(input) : null;
  const providerCategory = resolveWearProviderCategory(input);

  if (providerCategory) {
    return {
      categorySlug: providerCategory.slug,
      categoryLabel: providerCategory.label,
      source: "spreadconnect",
      fallbackCategory,
      topSub,
      providerCategory,
    };
  }

  return {
    categorySlug: fallbackCategory,
    categoryLabel: wearCategoryLabel(fallbackCategory),
    source: "fallback",
    fallbackCategory,
    topSub,
    providerCategory: null,
  };
}
