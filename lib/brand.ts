/** Public path to the horizontal wordmark (transparent SVG) for emails and absolute URLs. */
export const BRAND_LOGO_PUBLIC_PATH = "/potterymania-wordmark.svg";

/** Square app icon (transparent SVG) for favicon / PWA. */
export const BRAND_ICON_PUBLIC_PATH = "/potterymania-icon.svg";

/** Public counter cap for early-access social proof. */
export const PREREG_STUDIO_CAP = 500;

/** Public counters show the real DB count only. */
export const PREREG_DISPLAY_OFFSET = 0;

export function displayedPreRegTotal(dbCount: number): number {
  return Math.max(0, dbCount + PREREG_DISPLAY_OFFSET);
}
