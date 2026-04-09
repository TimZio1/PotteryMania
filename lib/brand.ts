/** Public path to the horizontal wordmark (transparent SVG) for emails and absolute URLs. */
export const BRAND_LOGO_PUBLIC_PATH = "/potterymania-wordmark.svg";

/** Square app icon (transparent SVG) for favicon / PWA. */
export const BRAND_ICON_PUBLIC_PATH = "/potterymania-icon.svg";

/** Shown as “n / cap” for early-access + landing pre-registration messaging. */
export const PREREG_STUDIO_CAP = 500;

/** Added to the live DB count for public counters. */
export const PREREG_DISPLAY_OFFSET = 20_120;

export function displayedPreRegTotal(dbCount: number): number {
  return Math.max(0, dbCount + PREREG_DISPLAY_OFFSET);
}
