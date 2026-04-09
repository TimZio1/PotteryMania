/** Locked global take rate for all commerce (500 = 5.0%). */
export const DEFAULT_PLATFORM_COMMISSION_BPS = 500;

/** Human label for marketing / UI, e.g. 500 → "5%". */
export function platformCommissionPercentLabel(bps: number): string {
  const pct = bps / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

/** Default platform take shown on marketing pages (matches `DEFAULT_PLATFORM_COMMISSION_BPS`). */
export const DEFAULT_PLATFORM_COMMISSION_PCT_LABEL =
  platformCommissionPercentLabel(DEFAULT_PLATFORM_COMMISSION_BPS);
