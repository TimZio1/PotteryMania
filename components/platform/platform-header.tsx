import Link from "next/link";
import { platformUi } from "@/lib/ui-styles";

type Variant = "dashboard" | "account";

/**
 * Shared top bar for platform (system) surfaces — matches dashboard nav affordances.
 */
export function PlatformHeader({ variant = "dashboard" }: { variant?: Variant }) {
  const nav = platformUi.navLink;
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-[var(--pm-space-4)] px-[var(--pm-space-4)] sm:h-16 sm:px-[var(--pm-space-8)]">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-100 sm:text-base">
          PotteryMania
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-[var(--pm-space-1)] text-sm sm:gap-[var(--pm-space-2)]" aria-label="Platform">
          {variant === "dashboard" ? (
            <>
              <Link href="/dashboard" className={nav}>
                Overview
              </Link>
              <Link href="/dashboard/billing" className={nav}>
                Billing
              </Link>
              <Link href="/cart" className={nav}>
                Cart
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className={nav}>
                Dashboard
              </Link>
              <Link href="/dashboard/billing" className={nav}>
                Billing
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
