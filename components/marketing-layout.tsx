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
    <div className="pm-marketing-shell flex min-h-screen flex-col text-(--brand-ink)">
      <SiteHeader showPublicSignIn={!isPreregistrationOnly()} />
      {toolbar ? (
        <div className="border-b border-stone-200/60 bg-white/70 backdrop-blur-sm">
          <div className={`${ui.pageContainer} py-3`}>{toolbar}</div>
        </div>
      ) : null}
      <MarketingPageTransition>{children}</MarketingPageTransition>
      <footer className="mt-auto border-t border-(--brand-line) bg-white/80 backdrop-blur-sm">
        <div className={`${ui.pageContainer} py-12 sm:py-14`}>
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div className="max-w-md">
              <BrandLogo size="md" className="text-(--brand-ink)" />
              <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
                The platform for pottery studios to create their website, sell their work, and manage bookings without
                stitching together five half-working tools.
              </p>
            </div>
            <div className="grid gap-x-12 gap-y-6 text-sm text-stone-700 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-600">Product</p>
                <Link href="/demo" className="block transition hover:text-(--brand-ink)">
                  Create your studio
                </Link>
                <Link href="/dashboard/studio/new?setup=bookings" className="block transition hover:text-(--brand-ink)">
                  Start with bookings
                </Link>
                <Link href="/dashboard/studio/new?setup=shop" className="block transition hover:text-(--brand-ink)">
                  Start with shop
                </Link>
                <Link href="/pricing" className="block transition hover:text-(--brand-ink)">
                  Pricing
                </Link>
              </div>
              <div className="space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-600">Resources</p>
                <Link href="/demo" className="block transition hover:text-(--brand-ink)">
                  Demo studio
                </Link>
                <Link href="/#clarity" className="block transition hover:text-(--brand-ink)">
                  How it works
                </Link>
                <Link href="/pricing#faq" className="block transition hover:text-(--brand-ink)">
                  FAQ
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
                <p className="text-xs font-medium uppercase tracking-wide text-stone-600">Contact</p>
                {!isPreregistrationOnly() ? (
                  <Link href="/login" className="block transition hover:text-(--brand-ink)">
                    Sign in
                  </Link>
                ) : null}
                <span className="block text-stone-500">Support details are available inside the app during early access.</span>
                <span className="block text-stone-500">Social links will be published here before launch.</span>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-(--brand-line) pt-6 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
            <p>© PotteryMania. All rights reserved.</p>
            <p>Free until 1 May 2026. No payment required.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
