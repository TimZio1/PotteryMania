"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { platformUi } from "@/lib/ui-styles";

const adminLinks = [
  { href: "/admin/my-business", label: "My business" },
  { href: "/admin", label: "Executive overview" },
  { href: "/admin/war-room", label: "War room" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/studios", label: "Studios" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/features", label: "Features" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/wear-products", label: "Wear products" },
  { href: "/admin/wear-orders", label: "Wear sales" },
  { href: "/admin/wear-analytics", label: "Wear analytics" },
  { href: "/admin/orders", label: "Studio sales" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/platform-features", label: "Platform add-ons" },
  { href: "/admin/feature-bundles", label: "Feature bundles" },
  { href: "/admin/business-templates", label: "Business templates" },
  { href: "/admin/storefront-domains", label: "Storefront domains" },
  { href: "/admin/marketplace", label: "Discovery controls (off)" },
  { href: "/admin/categories", label: "Ceramic categories" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/finance", label: "Finance engine" },
] as const;

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const linkActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="admin-mobile-drawer"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
          open
            ? "border-stone-700 bg-stone-900 text-white shadow-inner"
            : "border-stone-200 bg-white text-stone-800 shadow-sm hover:border-stone-300 hover:bg-stone-50",
        )}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Drawer below mobile header (z-60) so the toggle stays clickable; backdrop does not cover header */}
      <div
        className={cn("fixed inset-x-0 bottom-0 top-14 z-50 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          className={cn(
            "absolute inset-0 bg-black/45 transition-opacity duration-300 ease-out",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-label="Close menu"
          onClick={close}
        />

        <div
          id="admin-mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Hyperadmin navigation"
          className={cn(
            "absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-stone-200/90 bg-[#faf8f5] shadow-[0_0_40px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out",
            "rounded-l-2xl sm:max-w-[20rem]",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-stone-200/90 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Navigate</p>
              <p className="text-base font-semibold text-stone-900">Hyperadmin</p>
            </div>
            <button
              type="button"
              onClick={close}
              className={cn(
                platformUi.buttonGhost,
                "min-h-10 rounded-lg px-3 !text-stone-700 hover:!bg-stone-200/90 hover:!text-stone-950",
              )}
              aria-label="Close navigation menu"
            >
              <CloseIcon className="mx-auto" />
            </button>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" aria-label="Admin mobile nav">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className={cn(
                  "mb-0.5 flex min-h-11 w-full items-center rounded-xl px-3 text-sm font-medium transition-colors",
                  linkActive(link.href)
                    ? "bg-amber-950 text-white shadow-sm"
                    : "text-stone-800 hover:bg-stone-200/80 hover:text-stone-950",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="shrink-0 border-t border-stone-200/90 bg-[#f3f0ea] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Link
              href="/dashboard"
              onClick={close}
              className="flex min-h-11 w-full items-center justify-center rounded-xl border border-stone-300/80 bg-white px-3 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50"
            >
              Studio view
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
