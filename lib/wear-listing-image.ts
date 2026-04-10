import { normalizeWearCatalogImageUrl } from "@/lib/wear-product-json";

/**
 * Grids / thumbnails: request smaller Unsplash derivatives when possible so the
 * browser downloads fewer bytes; Next `Image` still applies its own pipeline.
 */
export function wearListingImageSrc(raw: string, maxWidth = 640): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const urlStr = normalizeWearCatalogImageUrl(trimmed);
  try {
    const u = new URL(urlStr);
    if (u.hostname === "images.unsplash.com") {
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "max");
      u.searchParams.set("w", String(maxWidth));
      u.searchParams.set("q", "72");
      return u.toString();
    }
  } catch {
    return urlStr;
  }
  return urlStr;
}
