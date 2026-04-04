"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";
function adminVisible(role: string | undefined) {
  return role === "admin" || role === "hyper_admin";
}

type SiteHeaderProps = {
  /** Hide for guests during preregistration-only (studio signup via /early-access only). */
  showPublicSignIn?: boolean;
};

export function SiteHeader({ showPublicSignIn = true }: SiteHeaderProps) {
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
    <header className="sticky top-0 z-40 border-b border-(--brand-line) bg-[rgba(250,248,245,0.88)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-18 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {authed ? (
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
          ) : null}
          <BrandLogo className="min-w-0 truncate text-(--brand-ink)" priority />
        </div>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Primary">
          {authed ? (
            <div className="hidden items-center gap-1 md:flex">
              <Link href="/cart" className={linkClass("/cart")}>
                Cart
              </Link>
              <Link href="/dashboard" className={linkClass("/dashboard")}>
                Dashboard
              </Link>
              <Link href="/my-bookings" className={linkClass("/my-bookings")}>
                Bookings
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
            </div>
          ) : (
            <>
              <Link
                href="/early-access"
                className="inline-flex min-h-11 max-w-44 items-center justify-center truncate rounded-full bg-(--brand-ink) px-3.5 text-xs font-medium text-white shadow-sm shadow-[rgba(44,24,16,0.14)] transition hover:bg-[#3a241a] sm:max-w-none sm:px-5 sm:text-sm"
              >
                Register your studio
              </Link>
              {showPublicSignIn ? (
                <Link href="/login" className={linkClass("/login")}>
                  Sign in
                </Link>
              ) : null}
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

      {/* Mobile sheet (signed-in only) */}
      {authed && open ? (
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
              <Link href="/cart" className={cn(ui.buttonGhost, "min-h-12 justify-start px-4 text-base")}>
                Cart
              </Link>
              <Link href="/dashboard" className={cn(ui.buttonGhost, "min-h-12 justify-start px-4 text-base")}>
                Dashboard
              </Link>
              <Link href="/my-bookings" className={cn(ui.buttonGhost, "min-h-12 justify-start px-4 text-base")}>
                My bookings
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
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
