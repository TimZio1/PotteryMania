import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { headers } from "next/headers";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingPageTransition } from "@/components/marketing/marketing-page-transition";
import { SiteHeader } from "@/components/site-header";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
import { isPreregistrationOnly } from "@/lib/preregistration";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";
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

/**
 * Apparel is the unconditional default. The legacy SaaS shell only renders if an
 * operator explicitly opts in with `NEXT_PUBLIC_HOMEPAGE_MODE=studio_legacy` AND
 * apparel-only launch mode is off. This protects against silent regressions when
 * `NEXT_PUBLIC_LAUNCH_MODE` is missing from the build env.
 */
function shouldRenderLegacyShell(apparelStorefront: boolean): boolean {
  if (apparelStorefront) return false;
  if (isApparelOnlyLaunch()) return false;
  return process.env.NEXT_PUBLIC_HOMEPAGE_MODE === "studio_legacy";
}

export async function MarketingLayout({ children, toolbar, apparelStorefront = false }: Props) {
  const requestHeaders = await headers();
  const hostHeader = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const normalizedHost = normalizeDomainName(stripPortFromHost(hostHeader) || "");
  const onPotterymania = isPotterymaniaMarketingHost(normalizedHost || null);
  const renderLegacy = shouldRenderLegacyShell(apparelStorefront);
  const apparelShell = !renderLegacy;
  const showSignIn = apparelShell || !isPreregistrationOnly();

  return (
    <div className="pm-marketing-shell flex min-h-screen flex-col text-[var(--foreground)]">
      <SiteHeader showPublicSignIn={showSignIn} apparelStorefront={apparelShell} />
      {toolbar ? (
        <div className="border-b border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur-sm">
          <div className={`${ui.pageContainer} py-3`}>{toolbar}</div>
        </div>
      ) : null}
      <MarketingPageTransition>{children}</MarketingPageTransition>
      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)]">
        <div className={`${ui.pageContainer} py-12 sm:py-16`}>
          {apparelShell ? (
            <div className="grid gap-10 lg:grid-cols-[1.3fr_2.4fr]">
              <div className="max-w-md">
                <BrandLogo size="md" className="text-[var(--foreground)]" />
                <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
                  T-shirts and apparel for potters, artists, and makers. Printed on demand in the EU.
                  Shipping and taxes are calculated at checkout.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Secure checkout · Stripe
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1">
                    EU shipping
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1">
                    Print-on-demand
                  </span>
                </div>
              </div>

              <div className="grid gap-x-10 gap-y-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]">
                    Shop
                  </p>
                  <Link href="/wear/shop" className="block text-[var(--muted)] transition hover:text-[var(--foreground)]">
                    All apparel
                  </Link>
                  <Link
                    href="/wear/shop?category=tops"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    T-shirts
                  </Link>
                  <Link
                    href="/wear/shop?category=hoodies"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Hoodies
                  </Link>
                  <Link
                    href="/wear/cart"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Cart
                  </Link>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]">
                    Help
                  </p>
                  <Link
                    href="/#faq"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Shipping & delivery
                  </Link>
                  <Link
                    href="/refunds"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Returns & refunds
                  </Link>
                  <Link
                    href="/#faq"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    FAQ
                  </Link>
                  <Link
                    href="/my-orders"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Track an order
                  </Link>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]">
                    Company
                  </p>
                  <Link
                    href="/about"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    About
                  </Link>
                  <Link
                    href="/wear/partner"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Affiliate program
                  </Link>
                  <a
                    href="mailto:support@potterymania.com"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Contact
                  </a>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]">
                    Legal
                  </p>
                  <Link
                    href="/terms"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Terms of service
                  </Link>
                  <Link
                    href="/privacy"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Privacy policy
                  </Link>
                  <Link
                    href="/refunds"
                    className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Refund policy
                  </Link>
                  <CookieSettingsButton className="block text-left text-[var(--muted)] transition hover:text-[var(--foreground)]" />
                  {showSignIn ? (
                    <Link
                      href="/login"
                      className="block text-[var(--muted)] transition hover:text-[var(--foreground)]"
                    >
                      Sign in
                    </Link>
                  ) : null}
                </div>
              </div>
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
            </Fragment>
          )}

          <div className="mt-10 flex flex-col gap-3 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} PotteryMania. All rights reserved.</p>
            {apparelShell ? (
              <p className="sm:text-right">
                Prices include VAT where applicable · Shipping calculated at checkout
              </p>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
