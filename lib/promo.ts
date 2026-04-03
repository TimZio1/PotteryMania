/**
 * Launch promotion: free activation + listing for all studio types
 * until the deadline. After this date the €5 activation fee applies.
 */

export const PROMO_DEADLINE = new Date("2026-05-01T23:59:59Z");

export const PROMO_LABEL = "Free until 1 May 2026";

export function isPromoActive(now = new Date()): boolean {
  return now < PROMO_DEADLINE;
}

export function promoTimeLeft(now = new Date()): {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const diff = PROMO_DEADLINE.getTime() - now.getTime();
  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);
  return { expired: false, days, hours, minutes, seconds };
}

/** EU defaults applied until user overrides */
export const EU_DEFAULTS = {
  currency: "EUR",
  locale: "en-IE",
  dateFormat: "dd/MM/yyyy",
  timezone: "Europe/Athens",
} as const;
