import type { Prisma } from "@prisma/client";

export function wearImageUrlsFromJson(images: Prisma.JsonValue): string[] {
  if (!Array.isArray(images)) return [];
  return images.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((u) => u.trim());
}
