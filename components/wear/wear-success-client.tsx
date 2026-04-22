"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { WEAR_CART_STORAGE_KEY, notifyWearCartChanged } from "@/lib/wear-cart";

export function WearSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (typeof window === "undefined" || !sessionId) return;
    localStorage.removeItem(WEAR_CART_STORAGE_KEY);
    notifyWearCartChanged();
  }, [sessionId]);

  return (
    <main className="min-h-[60vh] bg-[#f7f2ec] px-4 py-20 text-stone-900 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-500">Thank you</p>
        <h1 className="mt-6 font-serif text-3xl text-amber-950 sm:text-4xl">Order confirmed</h1>
        <p className="mt-6 text-sm leading-relaxed text-stone-600">
          Payment received. Stripe will email your receipt, and we&apos;ll let you know as soon as your pieces ship.
        </p>
        {sessionId ? (
          <p className="mt-4 font-mono text-[11px] text-stone-500 break-all">Ref: {sessionId}</p>
        ) : null}
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/wear/shop"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950 px-6 text-sm font-medium text-white hover:bg-amber-900"
          >
            Back to shop
          </Link>
          <Link
            href="/wear"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-200 bg-white px-6 text-sm font-medium text-stone-700 hover:border-amber-300/60 hover:bg-amber-50/60"
          >
            Identity
          </Link>
        </div>
      </div>
    </main>
  );
}
