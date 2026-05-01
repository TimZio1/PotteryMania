/** ISO 3166-1 alpha-2 — Stripe Checkout `shipping_address_collection.allowed_countries`. */
export const WEAR_FREE_SHIPPING_THRESHOLD_CENTS = 5000;

/**
 * Fallback (minor units) for wear checkout when currency is not EUR or GBP.
 */
export const WEAR_STANDARD_SHIPPING_CENTS = 900;

/**
 * Destinations we ship wear to. **US is intentionally omitted** (see {@link WEAR_SHIPPING_EXCLUDED_COUNTRIES}).
 * Any code here but **not** in {@link WEAR_SHIPPING_DOMESTIC_TIER_COUNTRIES} uses the same overseas
 * shipping table as AU (“third country” / long-haul pricing).
 */
export const WEAR_CHECKOUT_SHIPPING_COUNTRIES = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "GB",
  "CA",
  "AU",
] as const;

/** EU member states + IS + GB — low tier shipping (same table as each other). */
const WEAR_SHIPPING_DOMESTIC_TIER_COUNTRIES = new Set<string>([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "GB",
]);

/**
 * True when `iso2` is on the checkout list and uses the EU/IS/GB domestic tier table.
 * All other allowed countries (currently CA & AU; any future additions) use the overseas table — same as AU.
 */
export function isWearDomesticShippingTierCountry(iso2: string): boolean {
  const u = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(u)) return false;
  if (!(WEAR_CHECKOUT_SHIPPING_COUNTRIES as readonly string[]).includes(u)) return false;
  return WEAR_SHIPPING_DOMESTIC_TIER_COUNTRIES.has(u);
}

/**
 * Blocklist — must not appear in {@link WEAR_CHECKOUT_SHIPPING_COUNTRIES}. **US = no wear shipping.**
 */
export const WEAR_SHIPPING_EXCLUDED_COUNTRIES = ["US", "NO", "CH", "NZ"] as const;

/**
 * EU + IS + UK: value-based standard shipping (same numeric bands in EUR and GBP).
 * Subtotal is merchandise after discounts, in minor units.
 */
const WEAR_DOMESTIC_SHIPPING_TIERS: readonly { minSubtotalMinor: number; shippingMinor: number }[] = [
  { minSubtotalMinor: 4799, shippingMinor: 649 },
  { minSubtotalMinor: 1999, shippingMinor: 499 },
  { minSubtotalMinor: 1099, shippingMinor: 349 },
  { minSubtotalMinor: 1, shippingMinor: 299 },
];

/**
 * Third-country / overseas destinations: one table (same as AU) for every non-domestic allowed country.
 * Same numerals in EUR or GBP (e.g. 9.99 → 999).
 */
const WEAR_OVERSEAS_THIRD_COUNTRY_SHIPPING_TIERS: readonly { minSubtotalMinor: number; shippingMinor: number }[] = [
  { minSubtotalMinor: 5999, shippingMinor: 2499 },
  { minSubtotalMinor: 2499, shippingMinor: 1699 },
  { minSubtotalMinor: 1, shippingMinor: 999 },
];

function tieredShippingMinor(
  subtotalAfterDiscountMinor: number,
  tiers: readonly { minSubtotalMinor: number; shippingMinor: number }[],
): number {
  for (const tier of tiers) {
    if (subtotalAfterDiscountMinor >= tier.minSubtotalMinor) return tier.shippingMinor;
  }
  return tiers[tiers.length - 1]!.shippingMinor;
}

/**
 * Standard shipping in minor units for wear checkout, after discounts.
 * `shippingCountry` must be an ISO2 code from {@link WEAR_CHECKOUT_SHIPPING_COUNTRIES}.
 * Returns 0 when merchandise is at or above the free-shipping threshold.
 */
export function resolveWearShippingAmountMinorUnits(
  merchandiseSubtotalAfterDiscountMinor: number,
  currency: string,
  shippingCountry: string,
): number {
  if (merchandiseSubtotalAfterDiscountMinor >= WEAR_FREE_SHIPPING_THRESHOLD_CENTS) return 0;

  const c = currency.trim().toLowerCase();
  const useTierTables = c === "eur" || c === "gbp";

  if (!useTierTables) {
    return WEAR_STANDARD_SHIPPING_CENTS;
  }

  if (isWearDomesticShippingTierCountry(shippingCountry)) {
    return tieredShippingMinor(merchandiseSubtotalAfterDiscountMinor, WEAR_DOMESTIC_SHIPPING_TIERS);
  }

  return tieredShippingMinor(merchandiseSubtotalAfterDiscountMinor, WEAR_OVERSEAS_THIRD_COUNTRY_SHIPPING_TIERS);
}
