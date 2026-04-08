"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";

/** First segment after `/dashboard` for routes that are not the studio owner panel (`/dashboard/[studioId]/…`). */
const RESERVED = new Set([
  "billing",
  "studio",
  "products",
  "experiences",
  "bookings",
  "orders",
  "analytics",
  "referrals",
  "waitlist",
]);

const LISTING_LABELS: Record<string, string> = {
  products: "Products",
  experiences: "Experiences",
  bookings: "Bookings",
  orders: "Orders",
  analytics: "Analytics",
  referrals: "Referrals",
  waitlist: "Waitlist",
};

/**
 * Breadcrumbs for dashboard pages that are not wrapped in {@link StudioPanelShell}.
 * Studio panel URLs (`/dashboard/:studioId/...`) return null — the shell renders its own trail.
 */
export function DashboardRouteBreadcrumbs() {
  const pathname = usePathname();
  const items = useMemo(() => {
    const segs = pathname.split("/").filter(Boolean);
    if (segs[0] !== "dashboard") return null;
    if (segs.length === 1) {
      return [{ label: "Home", href: "/" }, { label: "Dashboard" }];
    }
    const a = segs[1];
    if (!RESERVED.has(a)) {
      return null;
    }

    const base = [
      { label: "Home", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
    ] as const;

    if (a === "billing") {
      return [...base, { label: "Billing" }];
    }
    if (a === "studio") {
      if (segs[2] === "new") return [...base, { label: "New studio" }];
      if (segs[2]) return [...base, { label: "Studio profile" }];
      return [...base, { label: "Studio" }];
    }
    if (LISTING_LABELS[a] && segs[2]) {
      return [...base, { label: LISTING_LABELS[a] }];
    }
    return [...base, { label: "Dashboard" }];
  }, [pathname]);

  if (!items) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-2 pt-4 sm:px-6">
      <Breadcrumbs items={items} />
    </div>
  );
}
