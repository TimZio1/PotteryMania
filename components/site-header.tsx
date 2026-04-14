"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

function adminVisible(role: string | undefined) {
  return role === "admin" || role === "hyper_admin";
}

type SiteHeaderProps = {
  showPublicSignIn?: boolean;
};

export function SiteHeader({ showPublicSignIn = true }: SiteHeaderProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  const authed = status === "authenticated" && session?.user;
  const role = session?.user?.role;
  const createStudioHref = authed ? "/dashboard/studio/new?setup=both" : "/demo";
  const createStudioActiveHref = authed ? "/dashboard/studio/new" : "/demo";

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", onKey);

      const restoreTarget = previousFocusRef.current;
      if (restoreTarget && document.body.contains(restoreTarget)) {
        restoreTarget.focus();
      }
    };
  }, [open, close]);

  const linkClass = (href: string) =>
    cn(
      ui.buttonGhost,
      pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
        ? "bg-amber-50 text-amber-950"
        : "",
    );

  const mobileLinkClass = (href: string) =>
    cn(
      ui.buttonGhost,
      "min-h-12 justify-start px-4 text-base",
      pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
        ? "bg-amber-50 text-amber-950"
        : "",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/75 backdrop-blur-xl supports-backdrop-filter:bg-white/65">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-18 sm:px-8 lg:px-12">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-700 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
          <BrandLogo className="min-w-0 truncate text-(--brand-ink)" />
        </div>

        <nav className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-2" aria-label="Primary">
          {authed ? (
            <div className="hidden items-center gap-1 md:flex">
              <Link href="/pricing" className={linkClass("/pricing")}>
                Pricing
              </Link>
              <Link href="/dashboard/studio/new?setup=both" className={linkClass("/dashboard/studio/new")}>
                Create your studio
              </Link>
              <Link href="/cart" className={linkClass("/cart")}>
                Cart
              </Link>
              <Link href="/dashboard" className={linkClass("/dashboard")}>
                Dashboard
              </Link>
              <Link href="/my-bookings" className={linkClass("/my-bookings")}>
                My bookings
              </Link>
              <Link href="/account" className={linkClass("/account")}>
                Account
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
              <div className="hidden items-center gap-1 md:flex">
                <Link href="/classes" className={linkClass("/classes")}>
                  Book a class
                </Link>
                <Link href="/studios" className={linkClass("/studios")}>
                  Studios
                </Link>
                <Link href="/pricing" className={linkClass("/pricing")}>
                  Pricing
                </Link>
                <Link href="/dashboard/studio/new?setup=both" className={linkClass("/dashboard/studio/new")}>
                  Create your studio
                </Link>
              </div>
              <Link href="/classes" className={`${ui.buttonMarketing} md:hidden`}>
                Book a class
              </Link>
              {showPublicSignIn ? (
                <Link href="/login" className={cn(linkClass("/login"), "hidden md:inline-flex")}>
                  Sign in
                </Link>
              ) : null}
            </>
          )}
        </nav>

        <div className="md:hidden" />
      </div>

      {/* Mobile sheet — available for all users */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn("absolute inset-0 bg-[rgba(44,24,16,0.35)] transition-opacity", open ? "opacity-100" : "opacity-0")}
          aria-label="Close menu"
          onClick={close}
        />
        <div
          className={cn(
            "absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-stone-200 bg-white shadow-xl transition-transform duration-200",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-stone-100 px-4">
            <span className="text-sm font-semibold text-(--brand-ink)">Menu</span>
            <button ref={closeButtonRef} type="button" className={cn(ui.buttonGhost, "min-h-10")} onClick={close}>
              Close
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Mobile primary">
            <Link href="/pricing" className={mobileLinkClass("/pricing")} onClick={close}>
              Pricing
            </Link>
            <Link href={createStudioHref} className={mobileLinkClass(createStudioActiveHref)} onClick={close}>
              Create your studio
            </Link>
            {authed ? (
              <>
                <Link href="/cart" className={mobileLinkClass("/cart")} onClick={close}>
                  Cart
                </Link>
                <Link href="/dashboard" className={mobileLinkClass("/dashboard")} onClick={close}>
                  Dashboard
                </Link>
                <Link href="/my-bookings" className={mobileLinkClass("/my-bookings")} onClick={close}>
                  My bookings
                </Link>
                <Link href="/account" className={mobileLinkClass("/account")} onClick={close}>
                  Account
                </Link>
                {adminVisible(role) ? (
                  <Link href="/admin" className={mobileLinkClass("/admin")} onClick={close}>
                    Admin
                  </Link>
                ) : null}
                <button
                  type="button"
                  className={cn(ui.buttonGhost, "min-h-12 justify-start px-4 text-base text-stone-600")}
                  onClick={() => {
                    close();
                    signOut({ callbackUrl: "/" });
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/classes" className={mobileLinkClass("/classes")} onClick={close}>
                  Book a class
                </Link>
                <Link href="/studios" className={mobileLinkClass("/studios")} onClick={close}>
                  Studios
                </Link>
                <Link href="/marketplace" className={mobileLinkClass("/marketplace")} onClick={close}>
                  Shop
                </Link>
                <hr className="my-2 border-stone-100" />
                {showPublicSignIn ? (
                  <Link href="/login" className={mobileLinkClass("/login")} onClick={close}>
                    Sign in
                  </Link>
                ) : null}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
