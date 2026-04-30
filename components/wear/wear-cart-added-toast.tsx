"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  WEAR_CART_ITEM_ADDED_EVENT,
  type WearCartItemAddedDetail,
} from "@/lib/wear-cart";

const VISIBLE_MS = 4000;

type ToastState = WearCartItemAddedDetail & {
  reduceMotion: boolean;
};

function primaryTitle(productName: string | undefined): string {
  const raw = productName?.trim();
  if (!raw) return "Added to your bag";
  return raw.length > 52 ? `${raw.slice(0, 50)}…` : raw;
}

function selectionSubtitle(toast: Pick<WearCartItemAddedDetail, "variantSummary" | "quantity">): string {
  const parts: string[] = [];
  const variant = toast.variantSummary?.trim();
  if (variant) parts.push(variant);
  if (toast.quantity != null && toast.quantity > 1) parts.push(`Qty ${toast.quantity}`);
  if (parts.length === 0) return "In your bag.";
  return `${parts.join(" · ")}.`;
}

function lineImageAlt(productName: string | undefined, variantSummary: string | undefined): string {
  const name = productName?.trim() || "Product";
  const v = variantSummary?.trim();
  return v ? `${name} — ${v}` : name;
}

export function WearCartAddedToast() {
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (unmountTimerRef.current) {
      clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onAdded = (e: Event) => {
      const detail = (e as CustomEvent<WearCartItemAddedDetail>).detail ?? {};
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      clearTimers();
      setVisible(false);
      setToast({
        viewCartHref: detail.viewCartHref?.trim() || "/wear/cart",
        productName: detail.productName?.trim() || undefined,
        lineImageSrc: detail.lineImageSrc?.trim() || undefined,
        variantSummary: detail.variantSummary?.trim() || undefined,
        quantity:
          typeof detail.quantity === "number" && Number.isFinite(detail.quantity) && detail.quantity > 1
            ? Math.min(99, Math.floor(detail.quantity))
            : undefined,
        reduceMotion,
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        const leaveMs = reduceMotion ? 0 : 280;
        unmountTimerRef.current = setTimeout(() => {
          setToast(null);
          unmountTimerRef.current = null;
        }, leaveMs);
      }, VISIBLE_MS);
    };
    window.addEventListener(WEAR_CART_ITEM_ADDED_EVENT, onAdded);
    return () => {
      window.removeEventListener(WEAR_CART_ITEM_ADDED_EVENT, onAdded);
      clearTimers();
    };
  }, [clearTimers]);

  if (!mounted || !toast) return null;

  const href = toast.viewCartHref || "/wear/cart";
  const motionClass = toast.reduceMotion
    ? visible
      ? "opacity-100"
      : "opacity-0"
    : visible
      ? "translate-y-0 opacity-100"
      : "translate-y-3 opacity-0 sm:translate-y-2";

  const imgSrc = toast.lineImageSrc?.trim();
  const imgAlt = lineImageAlt(toast.productName, toast.variantSummary);

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] z-100 flex justify-center px-4 lg:bottom-8">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`pointer-events-auto w-full max-w-md rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)] transition-[opacity,transform] duration-300 ease-out sm:px-5 ${motionClass}`}
      >
        <div className="flex gap-3">
          {imgSrc ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- toast portal; dynamic Spreadshirt/Unsplash URLs */}
              <img src={imgSrc} alt={imgAlt} className="h-full w-full object-cover" width={64} height={64} decoding="async" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-amber-950">{primaryTitle(toast.productName)}</p>
            <p className="mt-0.5 text-xs leading-snug text-stone-600">{selectionSubtitle(toast)}</p>
            <Link
              href={href}
              className="mt-2 inline-flex text-sm font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
            >
              View bag
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
