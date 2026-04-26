/**
 * Wear storefront currency policy — listing vs settlement.
 * Checkout uses each product's `currency` (Stripe session); today catalog is EUR-first.
 */

export const WEAR_LISTING_CURRENCY = "EUR";

/** Shop listing + PDP helper (short). */
export const WEAR_CURRENCY_SHOP_LINE = `Prices are shown in ${WEAR_LISTING_CURRENCY}.`;

/**
 * Full policy for cart and legal-adjacent surfaces: we charge in the session currency;
 * card issuers may present or settle in another currency.
 */
export const WEAR_CURRENCY_POLICY_FULL =
  `Prices are shown in ${WEAR_LISTING_CURRENCY}. Checkout charges in ${WEAR_LISTING_CURRENCY} when that is the product currency. If your card is issued in another country, your bank or Stripe may show or settle in a different currency at their conversion rate.`;

/** PDP / gallery — one line under shipping. */
export const WEAR_CURRENCY_PDP_LINE = `Listed in ${WEAR_LISTING_CURRENCY}; final card statement may differ if your bank converts.`;

/** Wear landing section 3 — minimal. */
export const WEAR_CURRENCY_LANDING_LINE = `All prices in ${WEAR_LISTING_CURRENCY} unless a product states otherwise.`;
