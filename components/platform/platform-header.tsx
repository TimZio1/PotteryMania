"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { platformUi } from "@/lib/ui-styles";

type Variant = "dashboard" | "account";

/**
 * Shared top bar for platform (system) surfaces — matches the studio control-panel shell.
 */
export function PlatformHeader({ variant = "dashboard" }: { variant?: Variant }) {
  const nav = platformUi.navLink;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  const links = useMemo(
    () =>
      variant === "dashboard"
        ? [
            { href: "/dashboard", label: "Studios" },
            { href: "/dashboard/billing", label: "Billing & add-ons" },
            { href: "/account", label: "Account" },
          ]
        : [
            { href: "/dashboard", label: "Studio control panel" },
            { href: "/my-bookings", label: "Session calendar" },
            { href: "/account", label: "Account" },
          ],
    [variant],
  );

  useEffect(() => {
    close();
  }, [pathname, close]);

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
      nav,
      pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
        ? "bg-amber-50 text-amber-950"
        : "",
    );

  const mobileLinkClass = (href: string) =>
    cn(
      platformUi.buttonGhost,
      "min-h-12 justify-start px-4 text-base",
      pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
        ? "bg-amber-50 text-amber-950"
        : "",
    );

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-(--pm-space-4) px-(--pm-space-4) sm:h-16 sm:px-(--pm-space-8)">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 shadow-sm md:hidden"
            aria-expanded={open}
            aria-controls="platform-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <Link href="/" className="text-sm font-semibold tracking-tight text-(--brand-ink) sm:text-base">
            PotteryMania
          </Link>
        </div>
        <nav className="hidden items-center justify-end gap-(--pm-space-1) text-sm sm:gap-(--pm-space-2) md:flex" aria-label="Platform">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
          <button type="button" className={nav} onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </button>
        </nav>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        id="platform-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Platform menu"
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn("absolute inset-0 bg-stone-950/35 transition-opacity", open ? "opacity-100" : "opacity-0")}
          aria-label="Close menu"
          onClick={close}
        />
        <div
          className={cn(
            "absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-stone-200 bg-[#fcfaf7] shadow-xl transition-transform duration-200",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-stone-200 px-4">
            <span className="text-sm font-semibold text-stone-900">Menu</span>
            <button ref={closeButtonRef} type="button" className={cn(platformUi.buttonGhost, "min-h-10")} onClick={close}>
              Close
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Platform mobile nav">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={mobileLinkClass(link.href)} onClick={close}>
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              className={cn(platformUi.buttonGhost, "min-h-12 justify-start px-4 text-base text-stone-600")}
              onClick={() => {
                close();
                signOut({ callbackUrl: "/" });
              }}
            >
              Sign out
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
