/**
 * Hyperadmin sidebar links.
 *
 * `adminLinks` is the full list (kept short on purpose; less-used screens are reachable
 * from their related hub pages — Settings, Content, etc).
 *
 * `apparelOnlyAdminLinks` is the operator surface for the apparel-only launch.
 * Studio/booking/marketplace infrastructure stays routable on disk, but it is not
 * advertised in the admin panel while PotteryMania is focused on apparel + affiliates.
 */

import { isApparelAdminMode } from "@/lib/launch-mode";

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
  { href: "/admin/wear-products", label: "Products" },
  { href: "/admin/wear-orders", label: "Orders" },
  { href: "/admin/affiliates", label: "Affiliates" },
  { href: "/admin/wear-analytics", label: "Analytics" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/users", label: "Customers" },
  { href: "/admin/notifications", label: "Inbox" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/settings", label: "Settings" },
] as const;

/** Returns the appropriate nav for the current launch mode. */
export function getActiveAdminLinks(): readonly AdminLink[] {
  return isApparelAdminMode() ? apparelOnlyAdminLinks : adminLinks;
}

/** Links that exist but are hidden right now — surfaced on the admin home for ops. */
export function getHiddenAdminLinks(): readonly AdminLink[] {
  if (!isApparelAdminMode()) return [];
  const visible = new Set(apparelOnlyAdminLinks.map((l) => l.href));
  return adminLinks.filter((l) => !visible.has(l.href));
}
