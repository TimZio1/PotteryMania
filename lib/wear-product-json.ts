import type { Prisma } from "@prisma/client";

/** Unsplash removed this asset (HEAD 404). Swap at read-time so stale DB rows work without migrate. */
const DEAD_UNSPLASH_SEGMENT = "photo-1610701596007-1150281fbcdd";
const LIVE_UNSPLASH_SEGMENT = "photo-1434389677669-e08b4cac3105";

export function normalizeWearCatalogImageUrl(url: string): string {
  if (url.includes(DEAD_UNSPLASH_SEGMENT)) {
    return url.replace(DEAD_UNSPLASH_SEGMENT, LIVE_UNSPLASH_SEGMENT);
  }
  return url;
}

export function wearImageUrlsFromJson(images: Prisma.JsonValue): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((u) => normalizeWearCatalogImageUrl(u.trim()));
}
