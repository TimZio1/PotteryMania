/**
 * Apparel-only launch narrows the public site to the wear storefront + affiliate program.
 *
 * Set at build time: NEXT_PUBLIC_LAUNCH_MODE=apparel_only
 * (Next.js inlines NEXT_PUBLIC_* during `next build` — set this in CI/Railway for the build step.)
 */
export type LaunchMode = "full" | "apparel_only";

export function getLaunchMode(): LaunchMode {
  const raw = process.env.NEXT_PUBLIC_LAUNCH_MODE?.trim().toLowerCase();
  if (raw === "apparel_only" || raw === "apparel-only") return "apparel_only";
  return "full";
}

export function isApparelOnlyLaunch(): boolean {
  return getLaunchMode() === "apparel_only";
}

/**
 * The operator admin defaults to the apparel control surface during the current launch.
 * Set NEXT_PUBLIC_ADMIN_MODE=legacy only when the old studio/booking hyperadmin is needed.
 */
export function isApparelAdminMode(): boolean {
  const raw = process.env.NEXT_PUBLIC_ADMIN_MODE?.trim().toLowerCase();
  return raw !== "legacy" && raw !== "hyperadmin";
}

/**
 * Feature visibility for the launch pivot. All flags derive from `NEXT_PUBLIC_LAUNCH_MODE`
 * except wearables + affiliates, which stay on for this phase.
 */
export const featureFlags = {
  /** Alias: apparel-only launch mode (see `apparelOnlyLaunch`). */
  get apparelOnly() {
    return isApparelOnlyLaunch();
  },
  get apparelOnlyLaunch() {
    return isApparelOnlyLaunch();
  },
  get bookings() {
    return !isApparelOnlyLaunch();
  },
  get studioTools() {
    return !isApparelOnlyLaunch();
  },
  get marketplace() {
    return !isApparelOnlyLaunch();
  },
  get classes() {
    return !isApparelOnlyLaunch();
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

/** After login, studio dashboard is not available in apparel-only mode (non-admin). */
export const APPAREL_ONLY_REDIRECT_TO_SHOP_IF_AUTH_PATHS = ["/dashboard"] as const;
