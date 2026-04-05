import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { EmailVerificationBanner } from "@/components/dashboard/email-verification-banner";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const showVerifyBanner =
    Boolean(session?.user?.email) && session?.user.emailVerified !== true;

  return (
    <div className="min-h-screen bg-stone-100/80">
      {showVerifyBanner && session?.user?.email ? (
        <EmailVerificationBanner email={session.user.email} />
      ) : null}
      <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-amber-950 sm:text-base">
            PotteryMania
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-1 text-sm sm:gap-2" aria-label="Dashboard">
            <Link href="/dashboard" className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100 hover:text-amber-950">
              Overview
            </Link>
            <Link href="/marketplace" className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100 hover:text-amber-950">
              Shop
            </Link>
            <Link href="/classes" className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100 hover:text-amber-950">
              Classes
            </Link>
            <Link href="/cart" className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100 hover:text-amber-950">
              Cart
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-none px-0 py-0 sm:px-0 sm:py-0">{children}</div>
    </div>
  );
}
