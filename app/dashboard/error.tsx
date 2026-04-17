"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ui } from "@/lib/ui-styles";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[dashboard-error]", error);
  }, [error]);

  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Dashboard error</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
        Something went wrong loading your dashboard. Please try again.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className={ui.buttonPrimary}>
          Try again
        </button>
        <Link href="/dashboard" className={ui.buttonSecondary}>
          Dashboard home
        </Link>
      </div>
    </main>
  );
}
