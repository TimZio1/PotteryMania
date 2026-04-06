/** Public path to the horizontal wordmark (transparent SVG) for emails and absolute URLs. */
export const BRAND_LOGO_PUBLIC_PATH = "/potterymania-wordmark.svg";

/** Square app icon (transparent SVG) for favicon / PWA. */
export const BRAND_ICON_PUBLIC_PATH = "/potterymania-icon.svg";

/** Shown as “n / cap” for early-access + landing pre-registration messaging. */
export const PREREG_STUDIO_CAP = 500;

/**
 * Added to the live DB count for public counters (e.g. historical or off-platform interest).
 * Displayed total = `earlyAccessSignup.count + PREREG_DISPLAY_OFFSET`.
 */
export const PREREG_DISPLAY_OFFSET = 231;

export function displayedPreRegTotal(dbCount: number): number {
  return dbCount + PREREG_DISPLAY_OFFSET;
}
