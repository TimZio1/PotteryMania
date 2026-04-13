import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import StudioLoyaltyClient from "@/components/dashboard/studio-loyalty-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Loyalty points",
    "loyalty",
    "Configure loyalty rewards, assign points per class, and track customer balances.",
  );
}

export default async function StudioLoyaltyPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const [config, experiences, balances] = await Promise.all([
    prisma.loyaltyConfig.findUnique({ where: { studioId } }),
    prisma.experience.findMany({
      where: { studioId, status: "active" },
      orderBy: { title: "asc" },
      select: { id: true, title: true, loyaltyPointsEarned: true },
    }),
    prisma.loyaltyBalance.findMany({
      where: { studioId },
      orderBy: { pointsBalance: "desc" },
      take: 100,
      include: { user: { select: { id: true, email: true, customerProfile: { select: { fullName: true } } } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Engagement</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Loyalty points</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Reward repeat customers automatically after completed classes and redeem points into gift cards.
        </p>
      </div>
      <StudioLoyaltyClient
        studioId={studioId}
        initialEnabled={config?.isEnabled ?? false}
        experiences={experiences}
        balances={balances.map((entry) => ({
          userId: entry.userId,
          fullName: entry.user.customerProfile?.fullName ?? null,
          email: entry.user.email,
          pointsBalance: entry.pointsBalance,
          totalEarned: entry.totalEarned,
          totalSpent: entry.totalSpent,
        }))}
      />
    </div>
  );
}
