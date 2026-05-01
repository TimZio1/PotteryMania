/**
 * Product surface: **apparel + affiliate program** only.
 * The former studio SaaS (bookings, marketplace, studio dashboard) is discontinued — legacy routes
 * remain in the repo for reference but are not exposed as a launch mode.
 */
export type LaunchMode = "apparel_only";

export function getLaunchMode(): LaunchMode {
  return "apparel_only";
}

export function isApparelOnlyLaunch(): boolean {
  return true;
}

/**
 * Operator admin defaults to the apparel control surface.
 * Set `NEXT_PUBLIC_ADMIN_MODE=legacy` only if you still need old hyperadmin plumbing during migration.
 */
export function isApparelAdminMode(): boolean {
  const raw = process.env.NEXT_PUBLIC_ADMIN_MODE?.trim().toLowerCase();
  return raw !== "legacy" && raw !== "hyperadmin";
}

/** Feature visibility — studio/booking/marketplace flags stay off. */
export const featureFlags = {
  get apparelOnly() {
    return true;
  },
  get apparelOnlyLaunch() {
    return true;
  },
  get bookings() {
    return false;
  },
  get studioTools() {
    return false;
  },
  get marketplace() {
    return false;
  },
  get classes() {
    return false;
  },
  wearables: true as const,
  affiliates: true as const,
};

export function getFeatureFlags() {
  return {
    apparelOnly: featureFlags.apparelOnly,
    apparelOnlyLaunch: featureFlags.apparelOnlyLaunch,
    bookings: featureFlags.bookings,
    studioTools: featureFlags.studioTools,
    marketplace: featureFlags.marketplace,
    classes: featureFlags.classes,
    wearables: featureFlags.wearables,
    affiliates: featureFlags.affiliates,
  } as const;
}

/** Public paths allowed without login while apparel-only mode is on. */
export const APPAREL_ONLY_PUBLIC_PATHS = [
  "/",
  "/shop",
  "/about",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/refunds",
  "/vendor-terms",
  "/checkout/success",
  "/unauthorized-admin",
  "/wear",
  "/w",
  "/cart",
  "/checkout",
  /**
   * Next.js metadata routes — must stay public in apparel-only mode so social-share
   * crawlers (facebookexternalhit, Twitterbot, LinkedInBot, etc.) can fetch the OG
   * image directly. The middleware matcher also excludes these as a primary defense;
   * listing them here is a belt-and-suspenders safety net.
   */
  "/opengraph-image",
  "/twitter-image",
  "/icon",
  "/apple-icon",
  /** Legacy customer paths: stay reachable so bookmarks redirect to the wear shop instead of a login wall. */
  "/my-bookings",
  "/my-packages",
  "/my-waitlist",
  "/my-memberships",
  "/my-loyalty",
] as const;

/** Legacy / discovery routes that redirect to home when apparel-only (admins may bypass in middleware). */
export const APPAREL_ONLY_REDIRECT_PREFIXES = [
  "/vision",
  "/early-access",
  "/pricing",
  "/demo",
  "/dashboard-demo",
  "/marketplace",
  "/classes",
  "/studios",
  "/category",
  "/gift-cards",
  "/blog",
  "/suggest-feature",
  "/embed",
  "/bookings",
  "/studio",
] as const;

/**
 * During apparel-only launch, send non-admin traffic away from legacy marketplace / booking entry points.
 */
export const APPAREL_ONLY_REDIRECT_TO_SHOP_PATHS = [
  "/cart",
  "/checkout",
  "/marketplace",
  "/classes",
  "/studios",
  "/category",
  "/gift-cards",
  "/bookings",
  "/studio",
] as const;

/**
 * Legacy paths that sent logged-in users to the shop (kept empty so `/dashboard`
 * stays available for orders, billing, and apparel affiliates).
 */
export const APPAREL_ONLY_REDIRECT_TO_SHOP_IF_AUTH_PATHS = [] as const;
