"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import type { StudioPanelNavItem } from "@/lib/studio-panel-nav";
import { studioPanelNav } from "@/lib/studio-panel-nav";

export default function StudioPanelShell({
  studioId,
  studioName,
  navItems,
  children,
}: {
  studioId: string;
  studioName: string;
  navItems?: StudioPanelNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const nav = navItems ?? studioPanelNav(studioId);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] w-full max-w-none flex-col sm:min-h-[calc(100vh-4rem)] lg:flex-row">
      <button
        type="button"
        className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 text-left text-sm font-medium text-amber-950 lg:hidden"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
      >
        <span>Menu · {studioName}</span>
        <span className="text-stone-500">{mobileOpen ? "Close" : "Open"}</span>
      </button>

      <aside
        className={`${
          mobileOpen ? "flex" : "hidden"
        } w-full shrink-0 flex-col border-stone-200 bg-white lg:flex lg:w-56 lg:border-r lg:pt-0`}
      >
        <div className="hidden border-b border-stone-100 px-4 py-4 lg:block">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Studio</p>
          <p className="mt-1 truncate text-sm font-semibold text-amber-950">{studioName}</p>
        </div>
        <nav className="flex flex-col gap-0.5 p-2 lg:p-3" aria-label="Studio panel">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-amber-950 text-white" : "text-stone-700 hover:bg-stone-100 hover:text-amber-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-stone-100 p-3">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-amber-950"
          >
            All studios
          </Link>
          <Link
            href="/marketplace"
            className="block rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-amber-950"
          >
            View marketplace
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-50"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-stone-50/80 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
