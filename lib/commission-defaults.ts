/** Locked global take rate for all commerce (500 = 5.0%). */
export const DEFAULT_PLATFORM_COMMISSION_BPS = 500;

/** Human label for marketing / UI, e.g. 500 → "5%". */
export function platformCommissionPercentLabel(bps: number): string {
  const pct = bps / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

/**
 * One plan-tier bullet for pricing cards: describes product vs booking platform fee when they differ.
 */
export function tierPlatformCommissionIncludeLine(productBps: number, bookingBps: number): string {
  const p = platformCommissionPercentLabel(productBps);
  const b = platformCommissionPercentLabel(bookingBps);
  if (productBps === bookingBps) {
    return `${p} platform commission on product sales and class bookings`;
  }
  return `${p} on product sales · ${b} on class bookings (platform commission)`;
}

/** Default platform take shown on marketing pages (matches `DEFAULT_PLATFORM_COMMISSION_BPS`). */
export const DEFAULT_PLATFORM_COMMISSION_PCT_LABEL =
  platformCommissionPercentLabel(DEFAULT_PLATFORM_COMMISSION_BPS);
