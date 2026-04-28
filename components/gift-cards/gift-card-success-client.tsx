"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function GiftCardSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <main className="pm-brand min-h-[60vh] bg-[var(--clay)] px-4 py-20 text-[var(--ink)] sm:px-6 sm:py-28">
      <div className="mx-auto max-w-md text-center">
        <p className="pm-caption text-[var(--heat)]">Thank you</p>
        <h1 className="pm-display mt-8 text-[2.25rem] leading-[0.96] text-[var(--ink)] sm:text-[3rem]">Gift card purchased</h1>
        <p className="mt-6 text-sm leading-relaxed text-[var(--shadow)] sm:text-base">
          Payment confirmed. We&rsquo;re activating the gift card now and emailing the code to your recipient.
        </p>
        {sessionId ? (
          <p className="mt-4 break-all font-mono text-[11px] text-[var(--shadow)]">Ref: {sessionId}</p>
        ) : null}
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link href="/gift-cards" className="pm-btn pm-btn--heat inline-flex min-h-12 items-center justify-center px-8">
            Buy another gift card
          </Link>
          <Link href="/" className="pm-btn pm-btn--ghost inline-flex min-h-12 items-center justify-center px-8">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
