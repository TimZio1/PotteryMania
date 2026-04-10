import Link from "next/link";

type Variant = "dashboard" | "account";

/**
 * Shared top bar for platform (system) surfaces — matches dashboard nav affordances.
 */
export function PlatformHeader({ variant = "dashboard" }: { variant?: Variant }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-100 sm:text-base">
          PotteryMania
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-sm sm:gap-2" aria-label="Platform">
          {variant === "dashboard" ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
              >
                Overview
              </Link>
              <Link
                href="/dashboard/billing"
                className="rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
              >
                Billing
              </Link>
              <Link href="/cart" className="rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100">
                Cart
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/billing"
                className="rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
              >
                Billing
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
