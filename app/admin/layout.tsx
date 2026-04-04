import Link from "next/link";
import type { ReactNode } from "react";
import { AdminSignOut } from "./admin-sign-out";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100/80">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-semibold text-amber-950">
              PotteryMania
            </Link>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
              Hyperadmin
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-stone-600">
            <Link href="/admin" className="hover:text-amber-950">
              Operations
            </Link>
            <Link href="/admin/finance" className="hover:text-amber-950">
              Financial engine
            </Link>
            <Link href="/dashboard" className="hover:text-amber-950">
              Vendor dashboard
            </Link>
            <AdminSignOut />
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}
