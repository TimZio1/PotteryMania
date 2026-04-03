"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";
import { PromoCountdownCompact } from "@/components/promo-countdown";

function adminVisible(role: string | undefined) {
  return role === "admin" || role === "hyper_admin";
}

export function SiteHeader() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const authed = status === "authenticated" && session?.user;
  const role = session?.user?.role;

  const linkClass = (href: string) =>
    cn(
      ui.buttonGhost,
      pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
        ? "bg-amber-50 text-amber-950"
        : "",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-700 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="sr-only">Menu</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {open ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
          <Link href="/" className="truncate text-base font-semibold tracking-tight text-amber-950 sm:text-lg">
            PotteryMania
          </Link>
          <span className="hidden sm:inline-flex"><PromoCountdownCompact /></span>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {authed ? (
            <>
              <Link href="/cart" className={linkClass("/cart")}>
                Cart
              </Link>
              <Link href="/dashboard" className={linkClass("/dashboard")}>
                Dashboard
              </Link>
              <Link href="/my-bookings" className={linkClass("/my-bookings")}>
                Bookings
              </Link>
              <Link href="/my-waitlist" className={linkClass("/my-waitlist")}>
                Waitlist
              </Link>
              {adminVisible(role) ? (
                <Link href="/admin" className={linkClass("/admin")}>
                  Admin
                </Link>
              ) : null}
              <button
                type="button"
                className={cn(ui.buttonGhost, "text-stone-600")}
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass("/login")}>
                Sign in
              </Link>
              <Link
                href="/register"
                className="ml-1 inline-flex min-h-11 items-center justify-center rounded-full bg-amber-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950"
              >
                Join
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {authed ? (
            <Link
              href="/cart"
              className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-stone-200 text-sm font-medium text-stone-800"
            >
              Cart
            </Link>
          ) : null}
        </div>
      </div>

      {/* Mobile sheet */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" id="mobile-nav">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40"
            aria-label="Close menu"
            onClick={close}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-stone-200 bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-stone-100 px-4">
              <span className="text-sm font-semibold text-stone-900">Menu</span>
              <button type="button" className={cn(ui.buttonGhost, "min-h-10")} onClick={close}>
                Close
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Mobile primary">
              {authed ? (
                <>
                  <Link href="/cart" className={cn(ui.buttonGhost, "min-h-12 justify-start px-4 text-base")}>
                    Cart
                  </Link>
                  <Link href="/dashboard" className={cn(ui.buttonGhost, "min-h-12 justify-start px-4 text-base")}>
                    Dashboard
                  </Link>
                  <Link href="/my-bookings" className={cn(ui.buttonGhost, "min-h-12 justify-start px-4 text-base")}>
                    My bookings
                  </Link>
                  <Link href="/my-waitlist" className={cn(ui.buttonGhost, "min-h-12 justify-start px-4 text-base")}>
                    My waitlist
                  </Link>
                  {adminVisible(role) ? (
                    <Link href="/admin" className={cn(ui.buttonGhost, "min-h-12 justify-start px-4 text-base")}>
                      Admin
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className={cn(ui.buttonGhost, "min-h-12 justify-start px-4 text-base text-stone-600")}
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className={cn(ui.buttonGhost, "min-h-12 justify-start px-4 text-base")}>
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="mx-2 mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-amber-950 text-sm font-medium text-white"
                  >
                    Create account
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
