"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  WEAR_CART_STORAGE_KEY,
  cartLineKey,
  notifyWearCartChanged,
  notifyWearItemAddedToCart,
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
  /** Defaults to 1; clamped to 1..99. */
  quantity?: number;
  /** Suppress the "Item in your bag — View cart" status text after add (used for sticky mobile CTA bars). */
  silentSuccess?: boolean;
  /** Unit price in cents — fed to Meta Pixel `AddToCart` event as `value` (× quantity). */
  unitPriceCents?: number;
  /** ISO-4217 currency code for Meta Pixel events (defaults to EUR). */
  currency?: string;
  /** Display name shown in Events Manager item rows. */
  productName?: string;
  /** Meta catalog offer id(s), matching `/api/meta/wear-catalog.csv`. Falls back to `productId`. */
  contentIds?: string[];
  /** Hero thumbnail URL for post-add toast (same frame the shopper was viewing). */
  lineImageSrc?: string;
  /** e.g. variant label `M · Navy` for toast copy. */
  variantSummary?: string;
};

export function WearAddToCartButton({
  productId,
  variantId = null,
  studioId,
  viewCartHref = "/wear/cart",
  className,
  label = "Cop it",
  quantity = 1,
  silentSuccess = false,
  unitPriceCents,
  currency = "EUR",
  productName,
  contentIds,
  lineImageSrc,
  variantSummary,
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
    const qty = Math.min(99, Math.max(1, Math.floor(quantity || 1)));
    const lineValue =
      unitPriceCents != null ? Number(((unitPriceCents * qty) / 100).toFixed(2)) : undefined;
    try {
      if (studioId) {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wearProductId: productId,
            wearProductVariantId: variantId,
            studioId,
            quantity: qty,
          }),
        });
        if (!res.ok) {
          throw new Error("Could not add wearable to cart");
        }
        notifyWearCartChanged();
        notifyWearItemAddedToCart({
          productName,
          viewCartHref,
          lineImageSrc,
          variantSummary,
          quantity: qty,
        });
        const refId = getWearPartnerReferralStudioId();
        trackWearEvent(WEAR_EVENT_KINDS.addToCart, {
          productId,
          variantId: variantId ?? undefined,
          contentIds: contentIds && contentIds.length > 0 ? contentIds : [productId],
          contentName: productName,
          ...(lineValue != null ? { value: lineValue, currency } : {}),
          quantity: qty,
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
        quantity: qty,
      };
      const targetKey = cartLineKey(incoming);
      const next: WearCartLine[] = [];
      let merged = false;
      for (const line of lines) {
        if (cartLineKey(line) === targetKey) {
          next.push({
            ...line,
            quantity: Math.min(99, line.quantity + qty),
          });
          merged = true;
        } else {
          next.push(line);
        }
      }
      if (!merged) next.push(incoming);
      localStorage.setItem(WEAR_CART_STORAGE_KEY, serializeWearCart(next));
      notifyWearCartChanged();
      notifyWearItemAddedToCart({
        productName,
        viewCartHref,
        lineImageSrc,
        variantSummary,
        quantity: qty,
      });
      const refId = getWearPartnerReferralStudioId();
      trackWearEvent(WEAR_EVENT_KINDS.addToCart, {
        productId,
        variantId: variantId ?? undefined,
        contentIds: contentIds && contentIds.length > 0 ? contentIds : [productId],
        contentName: productName,
        ...(lineValue != null ? { value: lineValue, currency } : {}),
        quantity: qty,
        meta: refId ? { referring_studio_id: refId } : undefined,
      });
      flashAdded();
    } finally {
      setBusy(false);
    }
  }, [
    productId,
    studioId,
    variantId,
    quantity,
    flashAdded,
    unitPriceCents,
    currency,
    productName,
    contentIds,
    viewCartHref,
    lineImageSrc,
    variantSummary,
  ]);

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
        {busy ? "Adding…" : justAdded && !silentSuccess ? "In the bag ✓" : label}
      </button>
      {justAdded && !silentSuccess ? (
        <p
          className="text-center text-xs font-semibold uppercase tracking-[0.14em] leading-snug text-emerald-800 sm:text-sm md:text-left"
          role="status"
          aria-live="polite"
        >
          In the bag —{" "}
          <Link href={viewCartHref} className="font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-900">
            View bag
          </Link>
        </p>
      ) : null}
    </div>
  );
}
