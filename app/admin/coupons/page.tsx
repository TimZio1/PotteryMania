import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import CouponsAdminClient from "@/components/admin/coupons-admin-client";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Coupons",
  "/admin/coupons",
  "Discount and coupon management.",
);

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const initial = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    percentOff: c.percentOff,
    amountOffCents: c.amountOffCents,
    maxRedemptions: c.maxRedemptions,
    redeemedCount: c.redeemedCount,
    validFrom: c.validFrom?.toISOString() ?? null,
    validUntil: c.validUntil?.toISOString() ?? null,
    isActive: c.isActive,
  }));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Commerce</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Promo codes</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Percent or fixed discounts apply to the cart subtotal (products and class deposits). Shipping and estimated tax
        are recalculated on the discounted subtotal. Checkout uses Stripe line items that match platform commission.
      </p>
      <CouponsAdminClient initial={initial} />
    </div>
  );
}
