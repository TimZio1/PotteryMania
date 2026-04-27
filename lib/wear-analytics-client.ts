"use client";

import { WEAR_EVENT_KINDS, type WearEventKind } from "@/lib/wear-event-kinds";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    /**
     * Meta Pixel base. Loaded by `<MetaPixel />` once `pm_cookie_consent=accepted`. Always optional —
     * we no-op when consent is missing or the env var isn't set, so callers don't have to guard.
     * Type matches `lib/meta-pixel.ts` to keep both modules' `declare global` blocks compatible.
     */
    fbq?: (...args: unknown[]) => void;
  }
}

type TrackOpts = {
  productId?: string | null;
  variantId?: string | null;
  orderId?: string | null;
  /**
   * Meta catalog ID(s) — must match the `id` field of items in your Meta catalog feed (catalog
   * 622117933589214 for PotteryMania). We send the wear product DB id; configure the catalog feed
   * to use the same, or override via this prop with slug / SKU if your feed uses a different id.
   */
  contentIds?: string[];
  /** Display name for the pixel — surfaces in Events Manager item rows. */
  contentName?: string;
  /** Major-currency value (e.g. 24.50 for €24.50). Required for AddToCart / InitiateCheckout / Purchase. */
  value?: number;
  /** ISO-4217 currency code (e.g. "EUR"). */
  currency?: string;
  /** Total units in this event. Defaults to 1 for ViewContent / AddToCart, sums for Purchase. */
  quantity?: number;
  /**
   * Idempotency key for browser ↔ CAPI dedup. Use Stripe `session_id` for Purchase so server-side
   * CAPI events with the same eventID collapse into one in Events Manager.
   */
  eventId?: string;
  meta?: Record<string, unknown>;
};

/**
 * Map our internal event kinds to Meta Pixel standard event names. Standard events are required for
 * Aggregated Event Measurement (iOS 14.5+) and ad optimization — custom events don't qualify.
 */
const META_PIXEL_EVENT: Partial<Record<WearEventKind, string>> = {
  [WEAR_EVENT_KINDS.productView]: "ViewContent",
  [WEAR_EVENT_KINDS.addToCart]: "AddToCart",
  [WEAR_EVENT_KINDS.checkoutStarted]: "InitiateCheckout",
  [WEAR_EVENT_KINDS.purchaseSuccess]: "Purchase",
};

export function trackWearEvent(kind: WearEventKind, opts: TrackOpts = {}) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", kind, {
      event_category: "wear",
      ...(opts.productId ? { product_id: opts.productId } : {}),
      ...(opts.variantId ? { variant_id: opts.variantId } : {}),
      ...(opts.orderId ? { order_id: opts.orderId } : {}),
      ...(opts.value != null ? { value: opts.value, currency: opts.currency ?? "EUR" } : {}),
      ...(opts.meta ? { ...opts.meta } : {}),
    });
  }

  if (typeof window !== "undefined" && window.fbq) {
    const pixelEvent = META_PIXEL_EVENT[kind];
    if (pixelEvent) {
      const contentIds =
        opts.contentIds && opts.contentIds.length > 0
          ? opts.contentIds
          : opts.productId
            ? [opts.productId]
            : undefined;
      const params: Record<string, unknown> = {
        ...(contentIds ? { content_ids: contentIds, content_type: "product" } : {}),
        ...(opts.contentName ? { content_name: opts.contentName } : {}),
        ...(opts.currency ? { currency: opts.currency } : {}),
        ...(opts.value != null ? { value: opts.value } : {}),
        ...(opts.quantity != null
          ? pixelEvent === "Purchase"
            ? { num_items: opts.quantity }
            : { contents: contentIds?.map((id) => ({ id, quantity: opts.quantity })) }
          : {}),
      };
      try {
        window.fbq("track", pixelEvent, params, opts.eventId ? { eventID: opts.eventId } : undefined);
      } catch {
        /* non-blocking */
      }
    }
  }

  const body = {
    kind,
    productId: opts.productId ?? undefined,
    variantId: opts.variantId ?? undefined,
    orderId: opts.orderId ?? undefined,
    meta: opts.meta ?? undefined,
  };

  void fetch("/api/wear/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    /* non-blocking */
  });
}

export { WEAR_EVENT_KINDS };
