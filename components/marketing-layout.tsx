import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingPageTransition } from "@/components/marketing/marketing-page-transition";
import { SiteHeader } from "@/components/site-header";
import { isPreregistrationOnly } from "@/lib/preregistration";
import { ui } from "@/lib/ui-styles";

type Props = {
  children: ReactNode;
  toolbar?: ReactNode;
};

export function MarketingLayout({ children, toolbar }: Props) {
  return (
    <div className="pm-marketing-shell flex min-h-screen flex-col text-[var(--foreground)]">
      <SiteHeader showPublicSignIn={!isPreregistrationOnly()} />
      {toolbar ? (
        <div className="border-b border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur-sm">
          <div className={`${ui.pageContainer} py-3`}>{toolbar}</div>
        </div>
      ) : null}
      <MarketingPageTransition>{children}</MarketingPageTransition>
      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)]">
        <div className={`${ui.pageContainer} py-12 sm:py-14`}>
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div className="max-w-md">
              <BrandLogo size="md" className="text-[var(--foreground)]" />
              <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                The platform for pottery studios to create their website, sell their work, and manage bookings without
                stitching together five half-working tools.
              </p>
            </div>
            <div className="grid gap-x-12 gap-y-6 text-sm text-[var(--muted)] sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Product</p>
                <Link href="/demo" className="block transition hover:text-[var(--foreground)]">
                  Create your studio
                </Link>
                <Link href="/dashboard/studio/new?setup=bookings" className="block transition hover:text-[var(--foreground)]">
                  Start with bookings
                </Link>
                <Link href="/dashboard/studio/new?setup=shop" className="block transition hover:text-[var(--foreground)]">
                  Start with shop
                </Link>
                <Link href="/pricing" className="block transition hover:text-[var(--foreground)]">
                  Pricing
                </Link>
              </div>
              <div className="space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Resources</p>
                <Link href="/demo" className="block transition hover:text-[var(--foreground)]">
                  Demo studio
                </Link>
                <Link href="/#clarity" className="block transition hover:text-[var(--foreground)]">
                  How it works
                </Link>
                <Link href="/pricing#faq" className="block transition hover:text-[var(--foreground)]">
                  FAQ
                </Link>
              </div>
              <div className="space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Legal</p>
                <Link href="/terms" className="block transition hover:text-[var(--foreground)]">
                  Terms
                </Link>
                <Link href="/privacy" className="block transition hover:text-[var(--foreground)]">
                  Privacy
                </Link>
                <Link href="/vendor-terms" className="block transition hover:text-[var(--foreground)]">
                  Studio terms
                </Link>
              </div>
              <div className="space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Contact</p>
                {!isPreregistrationOnly() ? (
                  <Link href="/login" className="block transition hover:text-[var(--foreground)]">
                    Sign in
                  </Link>
                ) : null}
                <span className="block text-[var(--muted)]">Support details are available inside the app during early access.</span>
                <span className="block text-[var(--muted)]">Social links will be published here before launch.</span>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; PotteryMania. All rights reserved.</p>
            <p>Free until 1 May 2026. No payment required.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
