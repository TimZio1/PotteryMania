import Link from "next/link";
import type { ReactNode } from "react";
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100/80">
      <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-amber-950 sm:text-base">
            PotteryMania
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-1 text-sm sm:gap-2" aria-label="Dashboard">
            <Link href="/dashboard" className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100 hover:text-amber-950">
              Overview
            </Link>
            <Link href="/marketplace" className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100 hover:text-amber-950">
              Shop
            </Link>
            <Link href="/classes" className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100 hover:text-amber-950">
              Classes
            </Link>
            <Link href="/cart" className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100 hover:text-amber-950">
              Cart
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}
