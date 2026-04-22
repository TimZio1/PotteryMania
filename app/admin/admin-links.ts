/**
 * Shared hyperadmin sidebar links. Kept short on purpose; less-used screens
 * are reachable from their related hub pages (Settings, Content, etc).
 */
export const adminLinks = [
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
