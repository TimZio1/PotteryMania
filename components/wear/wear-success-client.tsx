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
    <main className="min-h-[60vh] bg-neutral-950 px-4 py-20 text-neutral-100 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-neutral-500">Thank you</p>
        <h1 className="mt-6 font-serif text-3xl text-white sm:text-4xl">Order received</h1>
        <p className="mt-6 text-sm leading-relaxed text-neutral-400">
          Payment confirmed. You will get a receipt from Stripe; we&apos;ll follow up when your pieces ship.
        </p>
        {sessionId ? (
          <p className="mt-4 font-mono text-[11px] text-neutral-600 break-all">Ref: {sessionId}</p>
        ) : null}
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/wear/shop"
            className="inline-flex min-h-11 items-center justify-center border border-white/25 bg-white px-6 text-sm font-medium text-neutral-950 hover:bg-neutral-100"
          >
            Back to shop
          </Link>
          <Link
            href="/wear"
            className="inline-flex min-h-11 items-center justify-center border border-white/15 px-6 text-sm font-medium text-neutral-300 hover:text-white"
          >
            Identity
          </Link>
        </div>
      </div>
    </main>
  );
}
