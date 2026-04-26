/**
 * Apparel-only scoping for wear coupons (t-shirts vs hoodies vs all).
 * Uses Spreadconnect product type name and optional category JSON.
 */

export type WearApparelBucket = "tshirts" | "hoodies" | "other";

const TSHIRT_RE = /t-?shirt|tee\b|tank|polo|top\b|muscle|raglan/i;
const HOODIE_RE = /hoodie|hoody|sweat|pullover|zip\s*hood|crewneck|jumper|fleece/i;

function normalizeTypeName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

/** Walk shallow strings in category JSON for extra keywords (best-effort). */
function categoryBlobText(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.map(categoryBlobText).join(" ");
  if (typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>)
      .map(categoryBlobText)
      .join(" ");
  }
  return String(raw);
}

export function wearApparelBucketFromProduct(fields: {
  spreadconnectProductTypeName?: string | null;
  spreadconnectCategoryData?: unknown;
}): WearApparelBucket {
  const blob = `${normalizeTypeName(fields.spreadconnectProductTypeName)} ${categoryBlobText(fields.spreadconnectCategoryData)}`;
  if (HOODIE_RE.test(blob) && !TSHIRT_RE.test(blob)) return "hoodies";
  if (TSHIRT_RE.test(blob)) return "tshirts";
  if (HOODIE_RE.test(blob)) return "hoodies";
  return "other";
}

export type WearAppliesTo = "all" | "tshirts" | "hoodies" | "specific_products";

export function wearLineMatchesScope(args: {
  appliesTo: WearAppliesTo | null | undefined;
  productId: string;
  wearProductIds: unknown;
  bucket: WearApparelBucket;
}): boolean {
  const mode = (args.appliesTo ?? "all") as WearAppliesTo;
  if (mode === "all") return true;
  if (mode === "tshirts") return args.bucket === "tshirts";
  if (mode === "hoodies") return args.bucket === "hoodies";
  if (mode === "specific_products") {
    const ids = parseWearProductIdList(args.wearProductIds);
    return ids.has(args.productId);
  }
  return false;
}

function parseWearProductIdList(raw: unknown): Set<string> {
  if (!Array.isArray(raw)) return new Set();
  const out = new Set<string>();
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) out.add(x.trim());
  }
  return out;
}
