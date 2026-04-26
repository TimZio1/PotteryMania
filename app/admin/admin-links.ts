/**
 * Hyperadmin sidebar links.
 *
 * `adminLinks` is the full list (kept short on purpose; less-used screens are reachable
 * from their related hub pages — Settings, Content, etc).
 *
 * `apparelOnlyAdminLinks` is the curated subset shown when `featureFlags.apparelOnly`
 * is on: only the surfaces a single operator needs to run an apparel-only launch
 * (Wear catalog + sales + analytics, coupons, money, users, system, settings).
 *
 * Hidden links **stay routable** — the page files live on disk and can be reached by
 * pasting the URL or by the "Hidden in apparel-only" expander on the home admin page.
 * No code is deleted: when the studio platform reopens, swap the flag and the full nav
 * comes back automatically.
 */

import { isApparelOnlyLaunch } from "@/lib/launch-mode";

export type AdminLink = {
  href: string;
  label: string;
};

export const adminLinks: readonly AdminLink[] = [
  { href: "/admin", label: "Home" },
  { href: "/admin/war-room", label: "War room" },
  { href: "/admin/notifications", label: "Inbox" },
  { href: "/admin/operations", label: "Operations" },

  { href: "/admin/studios", label: "Studios" },
  { href: "/admin/users", label: "Users" },

  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/orders", label: "Sales" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/finance", label: "Finance" },

  { href: "/admin/wear-products", label: "Wear · products" },
  { href: "/admin/wear-orders", label: "Wear · sales" },
  { href: "/admin/wear-analytics", label: "Wear · analytics" },

  { href: "/admin/content", label: "Content" },
  { href: "/admin/features", label: "Plans & features" },
  { href: "/admin/coupons", label: "Coupons" },

  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/feature-suggestions", label: "Feature ideas" },
  { href: "/admin/audit", label: "Audit" },

  { href: "/admin/system", label: "System" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/my-business", label: "My business" },
] as const;

/**
 * Curated nav for the apparel-only launch. Order = priority for the single operator.
 *
 * Keep this list tight. If you find yourself opening one of the "hidden" pages weekly,
 * promote it here — don't recreate full studio sprawl.
 */
export const apparelOnlyAdminLinks: readonly AdminLink[] = [
  { href: "/admin", label: "Home" },
  { href: "/admin/wear-products", label: "Wear · products" },
  { href: "/admin/wear-orders", label: "Wear · sales" },
  { href: "/admin/wear-analytics", label: "Wear · analytics" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/notifications", label: "Inbox" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/settings", label: "Settings" },
] as const;

/** Returns the appropriate nav for the current launch mode. */
export function getActiveAdminLinks(): readonly AdminLink[] {
  return isApparelOnlyLaunch() ? apparelOnlyAdminLinks : adminLinks;
}

/** Links that exist but are hidden right now — surfaced on the admin home for ops. */
export function getHiddenAdminLinks(): readonly AdminLink[] {
  if (!isApparelOnlyLaunch()) return [];
  const visible = new Set(apparelOnlyAdminLinks.map((l) => l.href));
  return adminLinks.filter((l) => !visible.has(l.href));
}
