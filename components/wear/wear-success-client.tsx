"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { WEAR_CART_STORAGE_KEY, notifyWearCartChanged } from "@/lib/wear-cart";
import { clearWearPartnerReferral } from "@/lib/wear-referral-storage";
import { WEAR_EVENT_KINDS, trackWearEvent } from "@/lib/wear-analytics-client";
import {
  clearWearCheckoutSnapshot,
  readWearCheckoutSnapshot,
} from "@/lib/wear-checkout-snapshot";

export function WearSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (typeof window === "undefined" || !sessionId) return;
    localStorage.removeItem(WEAR_CART_STORAGE_KEY);
    notifyWearCartChanged();
    clearWearPartnerReferral();

    const snapshot = readWearCheckoutSnapshot();
    if (snapshot) {
      trackWearEvent(WEAR_EVENT_KINDS.purchaseSuccess, {
        orderId: snapshot.orderId ?? sessionId,
        contentIds: snapshot.contentIds,
        value: snapshot.value,
        currency: snapshot.currency,
        quantity: snapshot.numItems,
        eventId: sessionId,
      });
      clearWearCheckoutSnapshot();
    }
  }, [sessionId]);

  return (
    <main className="pm-brand min-h-[60vh] bg-[var(--clay)] px-4 py-20 text-[var(--ink)] sm:px-6 sm:py-28">
      <div className="mx-auto max-w-md text-center">
        <p className="pm-caption text-[var(--heat)]">Thank you</p>
        <h1 className="pm-display mt-8 text-[2.25rem] leading-[0.96] text-[var(--ink)] sm:text-[3rem]">Order confirmed</h1>
        <p className="mt-6 text-sm leading-relaxed text-[var(--shadow)] sm:text-base">
          Payment received. Stripe will email your receipt, and we&apos;ll let you know as soon as your pieces ship.
        </p>
        {sessionId ? (
          <p className="mt-4 break-all font-mono text-[11px] text-[var(--shadow)]">Ref: {sessionId}</p>
        ) : null}
        <p className="mt-8 text-sm text-[var(--shadow)]">
          Love the brand?{" "}
          <Link
            href="/wear/partner"
            className="font-semibold text-[var(--heat)] underline decoration-[var(--heat)]/40 underline-offset-4 transition hover:text-[var(--ink)]"
          >
            Partner program
          </Link>
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link href="/wear/shop" className="pm-btn pm-btn--heat group inline-flex min-h-12 items-center justify-center px-8">
            Back to shop
            <span aria-hidden className="ml-2 transition group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <Link href="/wear" className="pm-btn pm-btn--ghost inline-flex min-h-12 items-center justify-center px-8">
            Drop home
          </Link>
        </div>
      </div>
    </main>
  );
}
