import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";
import { AdminSignOut } from "./admin-sign-out";

const adminLinks = [
  { href: "/admin", label: "Executive overview" },
  { href: "/admin/war-room", label: "War room" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/platform-features", label: "Platform add-ons" },
  { href: "/admin/marketplace-ranking", label: "Marketplace ranking" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/finance", label: "Finance engine" },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100/80">
      <div className="mx-auto grid min-h-screen max-w-[1480px] gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-r border-stone-200 bg-white/95 shadow-sm">
          <div className="sticky top-0 flex h-full flex-col">
            <div className="border-b border-stone-200 px-5 py-5">
              <BrandLogo href="/" size="sm" className="text-amber-950" />
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
                  Hyperadmin
                </span>
                <Link href="/dashboard" className="text-xs font-medium text-stone-500 hover:text-amber-950">
                  Vendor view
                </Link>
              </div>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(ui.buttonGhost, "w-full justify-start px-4 text-sm font-medium")}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-stone-200 px-3 py-4">
              <AdminSignOut />
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="border-b border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <BrandLogo href="/" size="sm" className="text-amber-950" />
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
                Hyperadmin
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {adminLinks.slice(0, 5).map((link) => (
                <Link key={link.href} href={link.href} className={cn(ui.buttonGhost, "min-h-10 px-3 text-xs")}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="px-4 py-8 sm:px-6 sm:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
