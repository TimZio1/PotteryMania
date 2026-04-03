import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { ui } from "@/lib/ui-styles";

type Props = {
  children: ReactNode;
  /** Optional row under header: back link, breadcrumbs, etc. */
  toolbar?: ReactNode;
};

export function MarketingLayout({ children, toolbar }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <SiteHeader />
      {toolbar ? (
        <div className="border-b border-stone-200/80 bg-white">
          <div className={`${ui.pageContainer} py-3`}>{toolbar}</div>
        </div>
      ) : null}
      {children}
      <footer className="mt-auto border-t border-stone-200/80 bg-white">
        <div className={`${ui.pageContainer} flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between`}>
          <div>
            <p className="text-sm font-semibold text-amber-950">PotteryMania</p>
            <p className="mt-1 max-w-sm text-sm text-stone-500">
              Ceramics from independent studios — shop pieces or book a class.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-600">
            <Link href="/marketplace" className="hover:text-amber-950">
              Shop
            </Link>
            <Link href="/classes" className="hover:text-amber-950">
              Classes
            </Link>
            <Link href="/studios" className="hover:text-amber-950">
              Studios
            </Link>
            <Link href="/login" className="hover:text-amber-950">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
