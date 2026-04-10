"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ui } from "@/lib/ui-styles";

export default function ClassesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[classes-error]", error);
  }, [error]);

  return (
    <main className={`${ui.pageContainer} flex min-h-[60vh] flex-col items-center justify-center py-16 text-center`}>
      <h1 className="text-2xl font-semibold tracking-tight text-amber-950">Could not load classes</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">
        Something went wrong. Please try again or return to studio setup.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className={ui.buttonPrimary}>
          Try again
        </button>
        <Link href="/dashboard/studio/new?setup=bookings" className={ui.buttonSecondary}>
          Open bookings setup
        </Link>
      </div>
    </main>
  );
}
