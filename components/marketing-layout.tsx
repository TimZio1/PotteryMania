import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingPageTransition } from "@/components/marketing/marketing-page-transition";
import { SiteHeader } from "@/components/site-header";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
import { isPreregistrationOnly } from "@/lib/preregistration";
import { ui } from "@/lib/ui-styles";
import { normalizeDomainName, stripPortFromHost } from "@/lib/vendor-domain-core";

type Props = {
  children: ReactNode;
  toolbar?: ReactNode;
};

function isClayenseHostname(host: string | null): boolean {
  if (!host) return false;
  return (
    host === "clayense.com" ||
    host.endsWith(".clayense.com") ||
    host === "potterymania.com" ||
    host.endsWith(".potterymania.com")
  );
}

export async function MarketingLayout({ children, toolbar }: Props) {
  const requestHeaders = await headers();
  const hostHeader = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const normalizedHost = normalizeDomainName(stripPortFromHost(hostHeader) || "");
  const onClayense = isClayenseHostname(normalizedHost || null);

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
                {onClayense
                  ? "Catalog registration for independent studios. Submit your profile to join the Clayense guide."
                  : "For people who work with clay — from solo artists to full studios — sell your work, take bookings, and run everything in one calm system."}
              </p>
            </div>
            <div
              className={`grid gap-x-12 gap-y-6 text-sm text-[var(--muted)] ${
                onClayense ? "sm:grid-cols-1 lg:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {onClayense ? (
                <>
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Catalog</p>
                    <Link href="/" className="block transition hover:text-[var(--foreground)]">
                      Register your studio
                    </Link>
                    <Link href="/vision" className="block transition hover:text-[var(--foreground)]">
                      Our vision
                    </Link>
                    {!isPreregistrationOnly() ? (
                      <Link href="/login" className="block transition hover:text-[var(--foreground)]">
                        Sign in
                      </Link>
                    ) : null}
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Legal</p>
                    <Link href="/terms" className="block transition hover:text-[var(--foreground)]">
                      Terms
                    </Link>
                    <Link href="/privacy" className="block transition hover:text-[var(--foreground)]">
                      Privacy
                    </Link>
                    <CookieSettingsButton className="block text-left transition hover:text-[var(--foreground)]" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Product</p>
                    <Link href="/pricing" className="block transition hover:text-[var(--foreground)]">
                      Pricing
                    </Link>
                    <Link href="/demo" className="block transition hover:text-[var(--foreground)]">
                      See a demo
                    </Link>
                    <Link href="/dashboard/studio/new?setup=bookings" className="block transition hover:text-[var(--foreground)]">
                      Start with bookings
                    </Link>
                    <Link href="/dashboard/studio/new?setup=shop" className="block transition hover:text-[var(--foreground)]">
                      Start with shop
                    </Link>
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Explore</p>
                    <Link href="/marketplace" className="block transition hover:text-[var(--foreground)]">
                      Marketplace
                    </Link>
                    <Link href="/classes" className="block transition hover:text-[var(--foreground)]">
                      Classes
                    </Link>
                    <Link href="/studios" className="block transition hover:text-[var(--foreground)]">
                      Studios
                    </Link>
                    <Link href="/wear/shop" className="block transition hover:text-[var(--foreground)]">
                      Wearables shop
                    </Link>
                    <Link href="/blog" className="block transition hover:text-[var(--foreground)]">
                      Blog
                    </Link>
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Help</p>
                    <Link href="/pricing#faq" className="block transition hover:text-[var(--foreground)]">
                      FAQ
                    </Link>
                    <Link href="/suggest-feature" className="block transition hover:text-[var(--foreground)]">
                      Suggest a feature
                    </Link>
                    <Link href="/early-access" className="block transition hover:text-[var(--foreground)]">
                      Get early access
                    </Link>
                    {!isPreregistrationOnly() ? (
                      <Link href="/login" className="block transition hover:text-[var(--foreground)]">
                        Sign in
                      </Link>
                    ) : null}
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Legal</p>
                    <Link href="/terms" className="block transition hover:text-[var(--foreground)]">
                      Terms
                    </Link>
                    <Link href="/privacy" className="block transition hover:text-[var(--foreground)]">
                      Privacy
                    </Link>
                    <Link href="/refunds" className="block transition hover:text-[var(--foreground)]">
                      Refunds & cancellations
                    </Link>
                    <Link href="/vendor-terms" className="block transition hover:text-[var(--foreground)]">
                      Studio terms
                    </Link>
                    <CookieSettingsButton className="block text-left transition hover:text-[var(--foreground)]" />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-8 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)]">
            <p>&copy; Clayense. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
