"use client";

import { trackMetaPixelEvent } from "@/lib/meta-pixel";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type CartAddToCartItemType = "product" | "booking";

export type CartAddToCartOptions = {
  itemType: CartAddToCartItemType;
  itemId: string;
  itemName?: string;
  unitPriceCents?: number;
  valueCents?: number;
  currency?: string;
  quantity?: number;
};

function normaliseQuantity(quantity: number | undefined): number {
  if (quantity == null) return 1;
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.floor(quantity));
}

function centsToMajor(cents: number | undefined): number | undefined {
  if (cents == null || !Number.isFinite(cents)) return undefined;
  return Number((cents / 100).toFixed(2));
}

export function buildCartAddToCartPayload(opts: CartAddToCartOptions) {
  const quantity = normaliseQuantity(opts.quantity);
  const currency = opts.currency?.trim() || "EUR";
  const itemId = opts.itemId.trim();
  const value =
    centsToMajor(opts.valueCents) ?? centsToMajor(opts.unitPriceCents != null ? opts.unitPriceCents * quantity : undefined);
  const unitPrice = centsToMajor(opts.unitPriceCents) ?? (value != null ? Number((value / quantity).toFixed(2)) : undefined);
  const item = {
    item_id: itemId,
    item_category: opts.itemType,
    quantity,
    ...(opts.itemName ? { item_name: opts.itemName } : {}),
    ...(unitPrice != null ? { price: unitPrice } : {}),
  };

  return {
    ga4: {
      currency,
      ...(value != null ? { value } : {}),
      items: [item],
    },
    meta: {
      content_ids: [itemId],
      content_type: "product",
      ...(opts.itemName ? { content_name: opts.itemName } : {}),
      ...(value != null ? { value, currency } : {}),
      contents: [
        {
          id: itemId,
          quantity,
          ...(unitPrice != null ? { item_price: unitPrice } : {}),
        },
      ],
    },
  };
}

export function trackCartAddToCart(opts: CartAddToCartOptions): void {
  if (typeof window === "undefined") return;
  const itemId = opts.itemId.trim();
  if (!itemId) return;
  const payload = buildCartAddToCartPayload({ ...opts, itemId });

  if (typeof window.gtag === "function") {
    window.gtag("event", "add_to_cart", payload.ga4);
  }

  trackMetaPixelEvent("AddToCart", payload.meta);
}
