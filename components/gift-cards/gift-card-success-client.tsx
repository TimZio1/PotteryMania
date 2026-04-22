"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function GiftCardSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <main className="min-h-[60vh] bg-[var(--background)] px-4 py-20 text-[var(--foreground)] sm:px-6 sm:py-28">
      <div className="mx-auto max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--muted)]">Thank you</p>
        <h1 className="mt-6 font-serif text-3xl text-[var(--foreground)] sm:text-4xl">Gift card purchased</h1>
        <p className="mt-6 text-sm leading-relaxed text-[var(--muted)]">
          Payment confirmed. We&rsquo;re activating the gift card now and emailing the code to your recipient.
        </p>
        {sessionId ? (
          <p className="mt-4 break-all font-mono text-[11px] text-[var(--muted)]">Ref: {sessionId}</p>
        ) : null}
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/gift-cards"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border border-[var(--accent)]/50 bg-[var(--accent)] px-6 text-sm font-medium text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)]"
          >
            Buy another gift card
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-6 text-sm font-medium text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--surface-elevated)]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
