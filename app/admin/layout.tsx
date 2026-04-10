import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { metaAdminPage } from "@/lib/seo-routes";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/cn";
import { platformUi } from "@/lib/ui-styles";
import { AdminSignOut } from "./admin-sign-out";
import { AdminMobileNav } from "./admin-mobile-nav";

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
  { href: "/admin/categories", label: "Ceramic categories" },
  { href: "/admin/experiments", label: "Experiments" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/finance", label: "Finance engine" },
] as const;

export { adminLinks };

export const metadata: Metadata = metaAdminPage(
  "Hyperadmin",
  "/admin",
  "PotteryMania internal console for operations, studios, orders, bookings, and platform tools. Not indexed in search engines.",
);

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pm-visual-platform min-h-screen bg-zinc-950 text-zinc-100" data-pm-visual="platform">
      <div className="mx-auto grid min-h-screen max-w-[1480px] gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/10 bg-zinc-950 lg:block">
          <div className="sticky top-0 flex h-full flex-col">
            <div className="border-b border-white/10 px-5 py-5">
              <BrandLogo href="/" size="sm" variant="on-dark" />
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-200">
                  Hyperadmin
                </span>
                <Link href="/dashboard" className="text-xs font-medium text-zinc-500 hover:text-zinc-200">
                  Vendor view
                </Link>
              </div>
            </div>

            <nav aria-label="Hyperadmin sections" className="flex-1 space-y-1 px-3 py-4">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(platformUi.buttonGhost, "w-full justify-start px-4 text-sm font-medium")}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-white/10 px-3 py-4">
              <AdminSignOut />
            </div>
          </div>
        </aside>

        <main className="min-w-0 bg-zinc-950">
          <div className="border-b border-white/10 bg-zinc-950 px-4 py-4 sm:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <BrandLogo href="/" size="sm" variant="on-dark" />
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-200">
                  Hyperadmin
                </span>
                <AdminMobileNav />
              </div>
            </div>
          </div>

          <div className="px-4 py-8 sm:px-6 sm:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
