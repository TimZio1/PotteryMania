/** ISO 3166-1 alpha-2 — Stripe Checkout `shipping_address_collection.allowed_countries`. */
export const WEAR_FREE_SHIPPING_THRESHOLD_CENTS = 5000;
export const WEAR_STANDARD_SHIPPING_CENTS = 900;

/** Countries we do not ship wear to (must stay out of `WEAR_CHECKOUT_SHIPPING_COUNTRIES`). */
export const WEAR_SHIPPING_EXCLUDED_COUNTRIES = ["US", "NO", "CH", "NZ"] as const;

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
