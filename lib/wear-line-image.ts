import { sortWearCatalogImagesForDisplay, type WearCatalogImage } from "@/lib/wear-product-json";

export function normalizeWearAppearanceLabel(value: string | null | undefined): string {
  return value?.trim().toLowerCase() || "";
}

function appearanceMatchesColor(appearance: string | null | undefined, colorKey: string): boolean {
  if (!colorKey) return false;
  const a = normalizeWearAppearanceLabel(appearance);
  if (!a) return false;
  if (a === colorKey) return true;
  if (a.length >= colorKey.length && a.startsWith(colorKey)) return true;
  if (colorKey.length > a.length && colorKey.startsWith(a)) return true;
  return false;
}

type VariantForImage = {
  optionColor?: string | null;
  label?: string | null;
};

/**
 * Pick catalog image for a cart line — matches PDP color filtering via `appearanceName` ↔ variant color.
 */
export function pickWearLineCatalogImage(
  catalogImages: WearCatalogImage[],
  variant: VariantForImage | null | undefined,
): WearCatalogImage | null {
  if (!catalogImages.length) return null;

  const fromOption = variant?.optionColor?.trim();
  const fromLabel = (() => {
    const raw = variant?.label?.trim();
    if (!raw) return "";
    const parts = raw.split(" · ");
    if (parts.length >= 2) return parts[parts.length - 1]!.trim();
    return "";
  })();

  const colorGuess = fromOption || fromLabel;
  const key = normalizeWearAppearanceLabel(colorGuess);
  const sortedAll = sortWearCatalogImagesForDisplay(catalogImages);

  if (!key) {
    return sortedAll[0] ?? null;
  }

  const matching = sortedAll.filter((img) => appearanceMatchesColor(img.appearanceName, key));

  if (matching.length === 0) {
    return sortedAll[0] ?? null;
  }

  return sortWearCatalogImagesForDisplay(matching)[0] ?? null;
}
