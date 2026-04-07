"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ui } from "@/lib/ui-styles";

export default function WearError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[wear-error]", error);
  }, [error]);

  return (
    <main className={`${ui.pageContainer} flex min-h-[60vh] flex-col items-center justify-center py-16 text-center`}>
      <h1 className="text-2xl font-semibold tracking-tight text-amber-950">Something went wrong</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">
        We could not load this page. Please try again.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className={ui.buttonPrimary}>
          Try again
        </button>
        <Link href="/wear/shop" className={ui.buttonSecondary}>
          Back to shop
        </Link>
      </div>
    </main>
  );
}
