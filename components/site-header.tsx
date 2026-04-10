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

function wearZoneActive(pathname: string) {
  return pathname === "/wear" || pathname.startsWith("/wear/");
}

function useWearCartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wear-cart");
      if (raw) {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [];
        setCount(items.reduce((n: number, i: { qty?: number }) => n + (i.qty ?? 1), 0));
      }
    } catch {
      /* empty */
    }
    const onStorage = () => {
      try {
        const raw = localStorage.getItem("wear-cart");
        if (raw) {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : [];
          setCount(items.reduce((n: number, i: { qty?: number }) => n + (i.qty ?? 1), 0));
        } else {
          setCount(0);
        }
      } catch {
        /* empty */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return count;
}

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;
    return (
    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-800 px-1.5 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

type SiteHeaderProps = {
  showPublicSignIn?: boolean;
};

export function SiteHeader({ showPublicSignIn = true }: SiteHeaderProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wearCount = useWearCartCount();

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
        ? "bg-stone-100 text-stone-900"
        : "",
    );

  const mobileLinkClass = (href: string) =>
    cn(
      ui.buttonGhost,
      "min-h-12 justify-start px-4 text-base",
      pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
        ? "bg-stone-100 text-stone-900"
        : "",
    );

  const mobileWearClass = cn(
    ui.buttonGhost,
    "min-h-12 justify-start px-4 text-base",
    wearZoneActive(pathname) ? "bg-stone-100 text-stone-900" : "",
  );
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/75 backdrop-blur-xl supports-backdrop-filter:bg-white/65">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:h-18 sm:px-8 lg:px-10">
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
                Create studio site
              </Link>
              <Link
                href="/wear/shop"
                className={cn(ui.buttonGhost, wearZoneActive(pathname) ? "bg-stone-100 text-stone-900" : "")}
              >
                Wearables
                <CartBadge count={wearCount} />
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
                <Link href="/pricing" className={linkClass("/pricing")}>
                  Pricing
                </Link>
                <Link href="/dashboard/studio/new?setup=both" className={linkClass("/dashboard/studio/new")}>
                  For studios
                </Link>
                <Link
                  href="/wear/shop"
                  className={cn(ui.buttonGhost, wearZoneActive(pathname) ? "bg-stone-100 text-stone-900" : "")}
                >
                  Wearables
                  <CartBadge count={wearCount} />
                </Link>
              </div>
              <Link
                href="/dashboard/studio/new?setup=both"
                className="inline-flex min-h-11 max-w-44 items-center justify-center truncate rounded-full bg-stone-900 px-3.5 text-xs font-medium text-white shadow-sm transition hover:bg-stone-800 sm:max-w-none sm:px-5 sm:text-sm md:hidden"
              >
                Create studio website
              </Link>
              <Link
                href="/dashboard/studio/new?setup=both"
                className="hidden min-h-11 items-center justify-center truncate rounded-full bg-stone-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800 md:inline-flex"
              >
                Create studio website
              </Link>
              {showPublicSignIn ? (
                <Link href="/login" className={cn(linkClass("/login"), "hidden md:inline-flex")}>
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

      {/* Mobile sheet — available for all users */}
      <div
        className={cn(
          "fixed inset-0 z-120 md:hidden transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <button
          type="button"
          className={cn("absolute inset-0 bg-stone-900/40 transition-opacity", open ? "opacity-100" : "opacity-0")}
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
            <span className="text-sm font-semibold text-stone-900">Menu</span>
            <button type="button" className={cn(ui.buttonGhost, "min-h-10")} onClick={close}>
              Close
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Mobile primary">
            <Link href="/pricing" className={mobileLinkClass("/pricing")}>
              Pricing
            </Link>
            <Link href="/dashboard/studio/new?setup=both" className={mobileLinkClass("/dashboard/studio/new")}>
              For studios
            </Link>
            <Link href="/wear/shop" className={mobileWearClass}>
              Wearables
              <CartBadge count={wearCount} />
            </Link>
            {authed ? (
              <>
                <Link href="/cart" className={mobileLinkClass("/cart")}>
                  Cart
                </Link>
                <Link href="/dashboard" className={mobileLinkClass("/dashboard")}>
                  Dashboard
                </Link>
                <Link href="/my-bookings" className={mobileLinkClass("/my-bookings")}>
                  My bookings
                </Link>
                <Link href="/account" className={mobileLinkClass("/account")}>
                  Account
                </Link>
                {adminVisible(role) ? (
                  <Link href="/admin" className={mobileLinkClass("/admin")}>
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
                <hr className="my-2 border-stone-100" />
                <Link href="/dashboard/studio/new?setup=both" className={mobileLinkClass("/dashboard/studio/new")}>
                  Create studio website
                </Link>
                {showPublicSignIn ? (
                  <Link href="/login" className={mobileLinkClass("/login")}>
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
