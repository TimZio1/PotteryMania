"use client";

import { useRouter } from "next/navigation";

/** Shown when the wear shop failed to load catalog rows from the database after retries. */
export function WearShopRetryButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="mt-4 rounded-full border border-amber-800/40 bg-white px-5 py-2 text-sm font-medium text-amber-950 shadow-sm transition hover:bg-amber-50"
    >
      Try again
    </button>
  );
}
