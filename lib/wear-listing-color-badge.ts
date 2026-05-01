/** Variant row shape for listing “+N colors” badges (shop + home slabs). */
export type WearVariantColorBadgeInput = {
  optionColor?: string | null;
  isActive?: boolean | null;
};

/** Shared surface; add `absolute right-* top-*` (or `inset-x` + `top`) at call site. */
export const WEAR_LISTING_COLOR_BADGE_SURFACE =
  "pointer-events-none z-10 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90 backdrop-blur-[2px] ring-1 ring-white/15";

/**
 * When active variants declare multiple `optionColor` values, returns a short label
 * such as "+2 colors" (extras beyond the first colorway). Otherwise `null`.
 */
export function wearListingExtraColorsLabel(variants: WearVariantColorBadgeInput[] | null | undefined): string | null {
  if (!variants?.length) return null;
  const active = variants.filter((v) => v.isActive !== false);
  const colors = new Set<string>();
  for (const v of active) {
    const c = v.optionColor?.trim();
    if (c) colors.add(c.toLowerCase());
  }
  if (colors.size <= 1) return null;
  const extra = colors.size - 1;
  return `+${extra} ${extra === 1 ? "Color" : "Colors"}`;
}
