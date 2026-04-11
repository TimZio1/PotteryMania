"use client";

import { useCallback, useState } from "react";
import {
  WEAR_CART_STORAGE_KEY,
  cartLineKey,
  notifyWearCartChanged,
  parseWearCart,
  serializeWearCart,
  type WearCartLine,
} from "@/lib/wear-cart";
import { WEAR_EVENT_KINDS, trackWearEvent } from "@/lib/wear-analytics-client";

type Props = {
  productId: string;
  variantId?: string | null;
  className?: string;
  label?: string;
};

export function WearAddToCartButton({ productId, variantId = null, className, label = "Add to cart" }: Props) {
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(() => {
    setBusy(true);
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(WEAR_CART_STORAGE_KEY) : null;
      const lines = parseWearCart(raw);
      const incoming: WearCartLine = {
        productId,
        ...(variantId ? { variantId } : {}),
        quantity: 1,
      };
      const targetKey = cartLineKey(incoming);
      const next: WearCartLine[] = [];
      let merged = false;
      for (const line of lines) {
        if (cartLineKey(line) === targetKey) {
          next.push({
            ...line,
            quantity: Math.min(99, line.quantity + 1),
          });
          merged = true;
        } else {
          next.push(line);
        }
      }
      if (!merged) next.push(incoming);
      localStorage.setItem(WEAR_CART_STORAGE_KEY, serializeWearCart(next));
      notifyWearCartChanged();
      trackWearEvent(WEAR_EVENT_KINDS.addToCart, {
        productId,
        variantId: variantId ?? undefined,
      });
    } finally {
      setBusy(false);
    }
  }, [productId, variantId]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        className ??
        "inline-flex min-h-11 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950 px-6 text-sm font-medium tracking-wide text-white transition hover:bg-amber-900 disabled:opacity-60"
      }
    >
      {label}
    </button>
  );
}
