"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function GiftCardSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <main className="min-h-[60vh] bg-[#f7f2ec] px-4 py-20 text-(--brand-ink) sm:px-6 sm:py-28">
      <div className="mx-auto max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-500">Thank you</p>
        <h1 className="mt-6 font-serif text-3xl text-amber-950 sm:text-4xl">Gift card purchased</h1>
        <p className="mt-6 text-sm leading-relaxed text-stone-600">
          Payment confirmed. We are activating the gift card and sending the code to your recipient by email.
        </p>
        {sessionId ? (
          <p className="mt-4 break-all font-mono text-[11px] text-stone-500">Ref: {sessionId}</p>
        ) : null}
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/gift-cards"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-800/50 bg-amber-950 px-6 text-sm font-medium text-white hover:bg-amber-900"
          >
            Buy another gift card
          </Link>
          <Link
            href="/classes"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-200 bg-white px-6 text-sm font-medium text-stone-700 hover:border-amber-300/60 hover:bg-amber-50/60"
          >
            Browse classes
          </Link>
        </div>
      </div>
    </main>
  );
}
