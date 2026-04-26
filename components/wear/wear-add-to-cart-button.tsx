"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  WEAR_CART_STORAGE_KEY,
  cartLineKey,
  notifyWearCartChanged,
  parseWearCart,
  serializeWearCart,
  type WearCartLine,
} from "@/lib/wear-cart";
import { WEAR_EVENT_KINDS, trackWearEvent } from "@/lib/wear-analytics-client";
import { getWearPartnerReferralStudioId } from "@/lib/wear-referral-storage";

const ADDED_RESET_MS = 3000;

function successHaptic() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    navigator.vibrate?.(12);
  } catch {
    /* ignore */
  }
}

type Props = {
  productId: string;
  variantId?: string | null;
  studioId?: string;
  /** Where "View cart" sends buyers after add (studio embed uses `/cart`). */
  viewCartHref?: string;
  className?: string;
  label?: string;
};

export function WearAddToCartButton({
  productId,
  variantId = null,
  studioId,
  viewCartHref = "/wear/cart",
  className,
  label = "Add to cart",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    };
  }, []);

  const flashAdded = useCallback(() => {
    successHaptic();
    setJustAdded(true);
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => {
      setJustAdded(false);
      addedTimerRef.current = null;
    }, ADDED_RESET_MS);
  }, []);

  const onClick = useCallback(async () => {
    setBusy(true);
    try {
      if (studioId) {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wearProductId: productId,
            wearProductVariantId: variantId,
            studioId,
            quantity: 1,
          }),
        });
        if (!res.ok) {
          throw new Error("Could not add wearable to cart");
        }
        notifyWearCartChanged();
        const refId = getWearPartnerReferralStudioId();
        trackWearEvent(WEAR_EVENT_KINDS.addToCart, {
          productId,
          variantId: variantId ?? undefined,
          meta: refId ? { referring_studio_id: refId } : undefined,
        });
        flashAdded();
        return;
      }
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
      const refId = getWearPartnerReferralStudioId();
      trackWearEvent(WEAR_EVENT_KINDS.addToCart, {
        productId,
        variantId: variantId ?? undefined,
        meta: refId ? { referring_studio_id: refId } : undefined,
      });
      flashAdded();
    } finally {
      setBusy(false);
    }
  }, [productId, studioId, variantId, flashAdded]);

  const defaultButtonClass =
    "inline-flex min-h-11 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950 px-6 text-sm font-medium tracking-wide text-white transition hover:bg-amber-900 disabled:opacity-60";

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={className ?? defaultButtonClass}
        aria-busy={busy}
      >
        {busy ? "Adding…" : justAdded ? "Added to cart ✓" : label}
      </button>
      {justAdded ? (
        <p
          className="text-center text-xs font-medium leading-snug text-emerald-800 sm:text-sm md:text-left"
          role="status"
          aria-live="polite"
        >
          Item in your bag —{" "}
          <Link href={viewCartHref} className="font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-900">
            View cart
          </Link>
        </p>
      ) : null}
    </div>
  );
}
