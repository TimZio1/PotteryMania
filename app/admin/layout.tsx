import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { metaAdminPage } from "@/lib/seo-routes";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/cn";
import { platformUi } from "@/lib/ui-styles";
import { isApparelAdminMode } from "@/lib/launch-mode";
import { AdminSignOut } from "./admin-sign-out";
import { AdminMobileNav } from "./admin-mobile-nav";
import { adminLinks, getActiveAdminLinks } from "./admin-links";

export { adminLinks };

export const metadata: Metadata = metaAdminPage(
  "Hyperadmin",
  "/admin",
  "Platform control center: studios, money, system, and operations.",
);

export default function AdminLayout({ children }: { children: ReactNode }) {
  const links = getActiveAdminLinks();
  const apparelOnly = isApparelAdminMode();

  return (
    <div className="pm-visual-platform admin-light-tokens min-h-screen" data-pm-visual="platform">
      <div className="mx-auto grid min-h-screen max-w-[1480px] gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-stone-200/80 bg-stone-50/80 text-stone-900 lg:block">
          <div className="sticky top-0 flex h-full flex-col">
            <div className="border-b border-stone-200/80 px-5 py-5">
              <BrandLogo href="/" size="sm" className="!text-stone-900" />
              <div className="mt-4 flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                    apparelOnly
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-stone-200 bg-white text-stone-700",
                  )}
                  title={apparelOnly ? "Apparel-only launch mode is on" : undefined}
                >
                  {apparelOnly ? "Apparel admin" : "Hyperadmin"}
                </span>
                {apparelOnly ? (
                  <Link href="/wear/shop" className="text-xs font-medium text-stone-700 hover:text-amber-950">
                    View shop
                  </Link>
                ) : (
                  <Link href="/dashboard" className="text-xs font-medium text-stone-700 hover:text-amber-950">
                    Studio view
                  </Link>
                )}
              </div>
            </div>

            <nav aria-label="Hyperadmin sections" className="flex-1 space-y-1 px-3 py-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    platformUi.buttonGhost,
                    "w-full justify-start px-4 text-sm font-medium !text-stone-800 hover:!bg-stone-200/80 hover:!text-stone-950",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {apparelOnly ? (
              <div className="border-t border-stone-200/80 px-4 py-3 text-[11px] text-stone-500">
                <p>Only apparel sales, products, customers, inbox, and affiliate operations are shown.</p>
              </div>
            ) : null}

            <div className="border-t border-stone-200/80 px-3 py-4">
              <AdminSignOut />
            </div>
          </div>
        </aside>

        <main className="admin-main-canvas min-w-0">
          <div className="relative z-[60] flex h-14 shrink-0 items-center border-b border-stone-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:hidden">
            <div className="flex w-full items-center justify-between gap-3">
              <BrandLogo href="/" size="sm" className="!text-stone-900" />
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                    apparelOnly
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-stone-200 bg-white text-stone-700",
                  )}
                >
                  {apparelOnly ? "Apparel admin" : "Hyperadmin"}
                </span>
                <AdminMobileNav links={links} apparelOnly={apparelOnly} />
              </div>
            </div>
          </div>

          <div className="px-4 py-8 sm:px-6 sm:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
