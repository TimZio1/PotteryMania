import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import { StudioCouponsClient } from "@/components/dashboard/studio-coupons-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Promotions",
    "commerce/promotions",
    "Run discount codes with use limits and minimum spend.",
  );
}

export default async function StudioPromotionsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const coupons = await prisma.coupon.findMany({
    where: { studioId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      code: true,
      name: true,
      percentOff: true,
      amountOffCents: true,
      maxRedemptions: true,
      maxPerCustomer: true,
      minSubtotalCents: true,
      redeemedCount: true,
      validFrom: true,
      validUntil: true,
      isActive: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Revenue tools</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Promotions</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Create a discount code. Set how many times it works and a minimum cart total.
        </p>
      </div>

      <StudioCouponsClient
        studioId={studioId}
        initialCoupons={coupons.map((coupon) => ({
          ...coupon,
          validFrom: coupon.validFrom?.toISOString() ?? null,
          validUntil: coupon.validUntil?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
