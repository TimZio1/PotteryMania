/** Public path to the horizontal wordmark (transparent SVG) for emails and absolute URLs. */
export const BRAND_LOGO_PUBLIC_PATH = "/potterymania-wordmark.svg";

/** Square app icon (transparent SVG) for favicon / PWA. */
export const BRAND_ICON_PUBLIC_PATH = "/potterymania-icon.svg";

/** Public counter cap for early-access social proof. */
export const PREREG_STUDIO_CAP = 500;

/** Base offset applied to all public social-proof counters. */
export const SOCIAL_PROOF_BASE = 12468;

export function displayedPreRegTotal(dbCount: number): number {
  return Math.max(0, dbCount + SOCIAL_PROOF_BASE);
}
