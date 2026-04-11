"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { platformUi } from "@/lib/ui-styles";

type Variant = "dashboard" | "account";

/**
 * Shared top bar for platform (system) surfaces — matches the studio control-panel shell.
 */
export function PlatformHeader({ variant = "dashboard" }: { variant?: Variant }) {
  const nav = platformUi.navLink;
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-(--pm-space-4) px-(--pm-space-4) sm:h-16 sm:px-(--pm-space-8)">
        <Link href="/" className="text-sm font-semibold tracking-tight text-(--brand-ink) sm:text-base">
          PotteryMania
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-(--pm-space-1) text-sm sm:gap-(--pm-space-2)" aria-label="Platform">
          {variant === "dashboard" ? (
            <>
              <Link href="/dashboard" className={nav}>
                Studios
              </Link>
              <Link href="/dashboard/billing" className={nav}>
                Billing & add-ons
              </Link>
              <Link href="/account" className={nav}>
                Account
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className={nav}>
                Studio control panel
              </Link>
              <Link href="/my-bookings" className={nav}>
                Session calendar
              </Link>
              <Link href="/account" className={nav}>
                Account
              </Link>
            </>
          )}
          <button
            type="button"
            className={nav}
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
