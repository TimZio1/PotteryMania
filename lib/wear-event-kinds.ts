/** Stored in `WearAnalyticsEvent.kind` and mirrored to GA4 `event` where configured. */
export const WEAR_EVENT_KINDS = {
  productView: "wear_product_view",
  addToCart: "wear_add_to_cart",
  checkoutStarted: "wear_checkout_started",
  purchaseSuccess: "wear_purchase_success",
} as const;

export type WearEventKind = (typeof WEAR_EVENT_KINDS)[keyof typeof WEAR_EVENT_KINDS];

export const WEAR_EVENT_KIND_SET = new Set<string>(Object.values(WEAR_EVENT_KINDS));
