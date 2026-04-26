import Link from "next/link";
import { Fragment, type ReactNode } from "react";
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
  /** When true (wear routes): minimal footer + header focused on shop checkout, not studio onboarding. */
  apparelStorefront?: boolean;
};

/** Compact registration-style marketing shell (potterymania.com and local dev). */
function isPotterymaniaMarketingHost(host: string | null): boolean {
  if (!host) return false;
  if (host === "localhost" || host.startsWith("127.0.0.1") || host === "::1") return true;
  return host === "potterymania.com" || host.endsWith(".potterymania.com");
}

export async function MarketingLayout({ children, toolbar, apparelStorefront = false }: Props) {
  const requestHeaders = await headers();
  const hostHeader = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const normalizedHost = normalizeDomainName(stripPortFromHost(hostHeader) || "");
  const onPotterymania = isPotterymaniaMarketingHost(normalizedHost || null);

  return (
    <div className="pm-marketing-shell flex min-h-screen flex-col text-[var(--foreground)]">
      <SiteHeader showPublicSignIn={!isPreregistrationOnly()} apparelStorefront={apparelStorefront} />
      {toolbar ? (
        <div className="border-b border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur-sm">
          <div className={`${ui.pageContainer} py-3`}>{toolbar}</div>
        </div>
      ) : null}
      <MarketingPageTransition>{children}</MarketingPageTransition>
      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)]">
        <div className={`${ui.pageContainer} py-12 sm:py-14`}>
          {apparelStorefront ? (
            <div className="mx-auto max-w-2xl text-center sm:text-left">
              <BrandLogo size="md" className="mx-auto text-[var(--foreground)] sm:mx-0" />
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                Apparel printed on demand. Shipping and taxes are calculated at checkout — no directory, no studio signup
                required to buy.
              </p>
              <nav
                className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[var(--muted)] sm:justify-start"
                aria-label="Shop footer"
              >
                <Link href="/wear" className="transition hover:text-[var(--foreground)]">
                  Drop
                </Link>
                <Link href="/wear/shop" className="transition hover:text-[var(--foreground)]">
                  Shop
                </Link>
                <Link href="/wear/cart" className="transition hover:text-[var(--foreground)]">
                  Cart
                </Link>
                <Link href="/wear/partner" className="transition hover:text-[var(--foreground)]">
                  Partner
                </Link>
                <Link href="/" className="transition hover:text-[var(--foreground)]">
                  Site home
                </Link>
                <Link href="/terms" className="transition hover:text-[var(--foreground)]">
                  Terms
                </Link>
                <Link href="/privacy" className="transition hover:text-[var(--foreground)]">
                  Privacy
                </Link>
                {!isPreregistrationOnly() ? (
                  <Link href="/login" className="transition hover:text-[var(--foreground)]">
                    Sign in
                  </Link>
                ) : null}
              </nav>
              <div className="mt-4 text-sm text-[var(--muted)]">
                <CookieSettingsButton className="text-left transition hover:text-[var(--foreground)]" />
              </div>
              <p className="mt-8 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)]">
                &copy; PotteryMania. All rights reserved.
              </p>
            </div>
          ) : (
            <Fragment>
              <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
                <div className="max-w-md">
                  <BrandLogo size="md" className="text-[var(--foreground)]" />
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                    {onPotterymania
                      ? "The first global network & directory for independent artists and studios — on potterymania.com."
                      : "For people who work with clay — from solo artists to full studios — sell your work, take bookings, and run everything in one calm system."}
                  </p>
                </div>
                <div
                  className={`grid gap-x-12 gap-y-6 text-sm text-[var(--muted)] ${
                    onPotterymania ? "sm:grid-cols-1 lg:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"
                  }`}
                >
                  {onPotterymania ? (
                    <>
                      <div className="space-y-2.5">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">PotteryMania</p>
                        <Link href="/" className="block transition hover:text-[var(--foreground)]">
                          Register your artist or studio profile
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
                <p>&copy; PotteryMania. All rights reserved.</p>
              </div>
            </Fragment>
          )}
        </div>
      </footer>
    </div>
  );
}
