"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

const adminLinks = [
  { href: "/admin", label: "Executive overview" },
  { href: "/admin/war-room", label: "War room" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/studios", label: "Studios" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/features", label: "Features" },
  { href: "/admin/ai-insights", label: "AI insights" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/wear-products", label: "Wear products" },
  { href: "/admin/wear-orders", label: "Wear orders" },
  { href: "/admin/wear-analytics", label: "Wear analytics" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/platform-features", label: "Platform add-ons" },
  { href: "/admin/feature-bundles", label: "Feature bundles" },
  { href: "/admin/business-templates", label: "Business templates" },
  { href: "/admin/marketplace", label: "Public browse (off)" },
  { href: "/admin/experiments", label: "Experiments" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/finance", label: "Finance engine" },
] as const;

export function AdminMobileNav() {
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

  const linkActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-700"
        aria-label="Open admin menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40"
            aria-label="Close menu"
            onClick={close}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,18rem)] flex-col border-l border-stone-200 bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-stone-100 px-4">
              <span className="text-sm font-semibold text-amber-950">Admin</span>
              <button type="button" className={cn(ui.buttonGhost, "min-h-10")} onClick={close}>
                Close
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2" aria-label="Admin mobile nav">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    ui.buttonGhost,
                    "w-full justify-start px-3 py-2 text-sm",
                    linkActive(link.href) ? "bg-amber-50 text-amber-950" : "",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-stone-100 p-3">
              <Link
                href="/dashboard"
                className={cn(ui.buttonGhost, "w-full justify-start px-3 py-2 text-sm text-stone-600")}
              >
                Vendor view
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
