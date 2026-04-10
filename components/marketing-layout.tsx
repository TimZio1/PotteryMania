import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingPageTransition } from "@/components/marketing/marketing-page-transition";
import { SiteHeader } from "@/components/site-header";
import { isPreregistrationOnly } from "@/lib/preregistration";
import { ui } from "@/lib/ui-styles";

type Props = {
  children: ReactNode;
  /** Optional row under header: back link, breadcrumbs, etc. */
  toolbar?: ReactNode;
};

export function MarketingLayout({ children, toolbar }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader showPublicSignIn={!isPreregistrationOnly()} />
      {toolbar ? (
        <div className="border-b border-(--brand-line) bg-white/80">
          <div className={`${ui.pageContainer} py-3`}>{toolbar}</div>
        </div>
      ) : null}
      <MarketingPageTransition>{children}</MarketingPageTransition>
      <footer className="mt-auto border-t border-(--brand-line) bg-(--brand-soft)">
        <div className={`${ui.pageContainer} py-12 sm:py-14`}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-md">
              <BrandLogo size="md" className="text-(--brand-ink)" />
              <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
                The ceramics website platform for independent studios and makers. Built to sell work beautifully, fill
                classes, and help serious studios grow with more presence.
              </p>
            </div>
            <div className="grid gap-x-12 gap-y-6 text-sm text-stone-700 sm:grid-cols-3">
              <div className="space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-600">Product</p>
                <Link href="/dashboard/studio/new?setup=both" className="block transition hover:text-(--brand-ink)">
                  Studio website
                </Link>
                <Link href="/dashboard/studio/new?setup=bookings" className="block transition hover:text-(--brand-ink)">
                  Bookings setup
                </Link>
                <Link href="/dashboard/studio/new?setup=shop" className="block transition hover:text-(--brand-ink)">
                  Shop setup
                </Link>
                <Link href="/wear/shop" className="block transition hover:text-(--brand-ink)">
                  Wearables
                </Link>
                <Link href="/dashboard/studio/new?setup=both" className="block transition hover:text-(--brand-ink)">
                  Create studio website
                </Link>
              </div>
              <div className="space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-600">Legal</p>
                <Link href="/terms" className="block transition hover:text-(--brand-ink)">
                  Terms
                </Link>
                <Link href="/privacy" className="block transition hover:text-(--brand-ink)">
                  Privacy
                </Link>
                <Link href="/vendor-terms" className="block transition hover:text-(--brand-ink)">
                  Studio terms
                </Link>
              </div>
              <div className="space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-600">Account</p>
                {!isPreregistrationOnly() ? (
                  <Link href="/login" className="block transition hover:text-(--brand-ink)">
                    Sign in
                  </Link>
                ) : null}
                <Link href="/dashboard/studio/new?setup=both" className="block transition hover:text-(--brand-ink)">
                  Create studio website
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-(--brand-line) pt-6 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} PotteryMania.</p>
            <p>Made with clay and code.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
