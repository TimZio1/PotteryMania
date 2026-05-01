"use client";

import { WEAR_EVENT_KINDS, type WearEventKind } from "@/lib/wear-event-kinds";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "1956916491397785";

type MetaFbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
  push?: MetaFbq;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    /**
     * Meta Pixel base. Loaded by `<MetaPixel />` once `pm_cookie_consent=accepted`. Always optional —
     * we no-op when consent is missing or the env var isn't set, so callers don't have to guard.
     * Type matches `lib/meta-pixel.ts` to keep both modules' `declare global` blocks compatible.
     */
    fbq?: (...args: unknown[]) => void;
    _fbq?: MetaFbq;
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

/**
 * Fire `fbq` only when `<MetaPixel />` has loaded the real script after cookie consent.
 * Never assign `window.fbq` here: a stub created before fbevents.js makes Meta's bootstrap
 * (`if(f.fbq)return`) skip installation, so AddToCart never reaches Events Manager.
 */
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

  if (typeof window !== "undefined" && window.fbq && META_PIXEL_ID) {
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
            : (() => {
                const q = opts.quantity!;
                return {
                  contents: contentIds?.map((id) => ({
                    id,
                    quantity: q,
                    ...(opts.value != null && q > 0 ? { item_price: Number((opts.value / q).toFixed(2)) } : {}),
                  })),
                };
              })()
          : {}),
      };
      try {
        if (opts.eventId) {
          window.fbq("track", pixelEvent, params, { eventID: opts.eventId });
        } else {
          window.fbq("track", pixelEvent, params);
        }
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
