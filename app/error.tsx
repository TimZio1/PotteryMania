"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ui } from "@/lib/ui-styles";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <main
      className={`${ui.pageContainer} flex min-h-[60vh] flex-col items-center justify-center py-[var(--pm-space-16)] text-center`}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-800">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-amber-950">Something went wrong</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">
        We hit an unexpected error. You can try again, or head back to a safe page.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className={ui.buttonPrimary}>
          Try again
        </button>
        <Link href="/" className={ui.buttonSecondary}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
