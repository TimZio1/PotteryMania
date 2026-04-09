export const WEAR_CATEGORIES = ["tops", "hoodies", "headwear", "accessories", "other"] as const;

export type WearCategory = (typeof WEAR_CATEGORIES)[number];

export const WEAR_CATEGORY_LABELS: Record<WearCategory, string> = {
  tops: "Tops",
  hoodies: "Hoodies & Sweatshirts",
  headwear: "Headwear",
  accessories: "Accessories",
  other: "Other",
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
};

export function isWearCategory(value: string | null | undefined): value is WearCategory {
  if (!value) return false;
  return (WEAR_CATEGORIES as readonly string[]).includes(value);
}

export function resolveWearCategory(input: WearCategoryInput): WearCategory {
  const slug = (input.slug ?? "").trim().toLowerCase();
  const direct = WEAR_CATEGORY_OVERRIDES[slug];
  if (direct) return direct;

  const corpus = [input.slug, input.name, input.subtitle, input.description]
    .filter((x): x is string => typeof x === "string" && x.trim() !== "")
    .join(" ");

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((rx) => rx.test(corpus))) return rule.category;
  }
  return "other";
}

export function wearCategoryLabel(category: WearCategory): string {
  return WEAR_CATEGORY_LABELS[category];
}
