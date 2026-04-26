import type { Prisma } from "@prisma/client";

/** Unsplash removed this asset (HEAD 404). Swap at read-time so stale DB rows work without migrate. */
const DEAD_UNSPLASH_SEGMENT = "photo-1610701596007-1150281fbcdd";
const LIVE_UNSPLASH_SEGMENT = "photo-1434389677669-e08b4cac3105";

export type WearCatalogImage = {
  url: string;
  appearanceName: string | null;
  appearanceId: number | null;
  perspective: string | null;
  imageId: number | null;
};

export function normalizeWearCatalogImageUrl(url: string): string {
  if (url.includes(DEAD_UNSPLASH_SEGMENT)) {
    return url.replace(DEAD_UNSPLASH_SEGMENT, LIVE_UNSPLASH_SEGMENT);
  }
  return url;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asFiniteInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function normalizeWearCatalogImage(image: WearCatalogImage): WearCatalogImage {
  return {
    url: normalizeWearCatalogImageUrl(image.url.trim()),
    appearanceName: image.appearanceName?.trim() || null,
    appearanceId: image.appearanceId,
    perspective: image.perspective?.trim() || null,
    imageId: image.imageId,
  };
}

/**
 * Order images for storefront PDPs: front/hero first, then angles, back, detail, lifestyle/context.
 * Uses Spreadconnect `perspective` when present; unknown perspectives keep sync order (stable tie-break).
 */
export function sortWearCatalogImagesForDisplay(images: WearCatalogImage[]): WearCatalogImage[] {
  const rank = (perspective: string | null): number => {
    const u = (perspective ?? "").toUpperCase();
    if (!u.trim()) return 40;
    if (/\b(FRONT|MAIN|HERO|PRIMARY|DEFAULT)\b/.test(u)) return 0;
    if (/\b(SIDE|ANGLE|PROFILE|QUARTER)\b/.test(u)) return 10;
    if (/\b(BACK|REAR)\b/.test(u)) return 20;
    if (/\b(DETAIL|CLOSE|ZOOM|LABEL|NECK|COLLAR)\b/.test(u)) return 30;
    if (/\b(LIFE|CONTEXT|MODEL|ONBODY|FLAT|LAY)\b/.test(u)) return 45;
    return 35;
  };

  return [...images].sort((a, b) => {
    const ra = rank(a.perspective);
    const rb = rank(b.perspective);
    if (ra !== rb) return ra - rb;
    const ia = a.imageId ?? Number.MAX_SAFE_INTEGER;
    const ib = b.imageId ?? Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return a.url.localeCompare(b.url);
  });
}

export function wearImagesFromJson(images: Prisma.JsonValue): WearCatalogImage[] {
  if (!Array.isArray(images)) return [];

  const out: WearCatalogImage[] = [];
  const seen = new Set<string>();

  for (const value of images) {
    let next: WearCatalogImage | null = null;

    if (typeof value === "string" && value.trim().length > 0) {
      next = {
        url: value,
        appearanceName: null,
        appearanceId: null,
        perspective: null,
        imageId: null,
      };
    } else if (isRecord(value)) {
      const rawUrl = asNonEmptyString(value.url) ?? asNonEmptyString(value.imageUrl);
      if (!rawUrl) continue;

      next = {
        url: rawUrl,
        appearanceName: asNonEmptyString(value.appearanceName),
        appearanceId: asFiniteInteger(value.appearanceId),
        perspective: asNonEmptyString(value.perspective),
        imageId: asFiniteInteger(value.imageId) ?? asFiniteInteger(value.id),
      };
    }

    if (!next) continue;
    const normalized = normalizeWearCatalogImage(next);
    if (!normalized.url) continue;

    const key = [
      normalized.url,
      normalized.appearanceName ?? "",
      normalized.perspective ?? "",
      normalized.imageId ?? "",
    ].join("::");

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }

  return out;
}

export function wearImageUrlsFromJson(images: Prisma.JsonValue): string[] {
  return wearImagesFromJson(images).map((image) => image.url);
}

export function wearImagesToJson(images: WearCatalogImage[]): Prisma.InputJsonValue {
  return images.map((image) => {
    const normalized = normalizeWearCatalogImage(image);
    const record: Record<string, string | number> = { url: normalized.url };
    if (normalized.appearanceName) record.appearanceName = normalized.appearanceName;
    if (normalized.appearanceId != null) record.appearanceId = normalized.appearanceId;
    if (normalized.perspective) record.perspective = normalized.perspective;
    if (normalized.imageId != null) record.imageId = normalized.imageId;
    return record;
  }) as Prisma.InputJsonValue;
}

export function mergeWearImageUrlsWithExistingMetadata(
  urls: string[],
  existingImages: Prisma.JsonValue,
): Prisma.InputJsonValue {
  const existingByUrl = new Map(wearImagesFromJson(existingImages).map((image) => [image.url, image]));
  const merged: WearCatalogImage[] = [];
  const seen = new Set<string>();

  for (const value of urls) {
    const normalizedUrl = normalizeWearCatalogImageUrl(value.trim());
    if (!normalizedUrl || seen.has(normalizedUrl)) continue;
    seen.add(normalizedUrl);
    merged.push(
      existingByUrl.get(normalizedUrl) ?? {
        url: normalizedUrl,
        appearanceName: null,
        appearanceId: null,
        perspective: null,
        imageId: null,
      },
    );
  }

  return wearImagesToJson(merged);
}
