/** Basis points when no CommissionRule and no admin_configs row (380 = 3.8%). */
export const DEFAULT_PLATFORM_COMMISSION_BPS = 380;

/** Human label for marketing / UI, e.g. 380 → "3.8%". */
export function platformCommissionPercentLabel(bps: number): string {
  const pct = bps / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

/** Default platform take shown on marketing pages (matches `DEFAULT_PLATFORM_COMMISSION_BPS`). */
export const DEFAULT_PLATFORM_COMMISSION_PCT_LABEL =
  platformCommissionPercentLabel(DEFAULT_PLATFORM_COMMISSION_BPS);
