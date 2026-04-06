"use client";

import { WEAR_EVENT_KINDS, type WearEventKind } from "@/lib/wear-event-kinds";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type TrackOpts = {
  productId?: string | null;
  variantId?: string | null;
  orderId?: string | null;
  meta?: Record<string, unknown>;
};

export function trackWearEvent(kind: WearEventKind, opts: TrackOpts = {}) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", kind, {
      event_category: "wear",
      ...(opts.productId ? { product_id: opts.productId } : {}),
      ...(opts.variantId ? { variant_id: opts.variantId } : {}),
      ...(opts.orderId ? { order_id: opts.orderId } : {}),
      ...(opts.meta ? { ...opts.meta } : {}),
    });
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
