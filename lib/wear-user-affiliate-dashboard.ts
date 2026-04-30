import { prisma } from "@/lib/db";
import { siteMetadata } from "@/lib/seo";

export type UserAffiliateProgramRow = {
  studioId: string;
  displayName: string;
  code: string;
  enabled: boolean;
  marginPercentLabel: string;
  shareUrl: string;
  stripePayoutsReady: boolean;
  referredOrders: number;
  unpaidCents: number;
  payoutPendingCents: number;
  paidCents: number;
  lastSaleAt: string | null;
};

function marginLabel(bps: number): string {
  return `${Math.round(bps / 100)}%`;
}

/**
 * Wear affiliate programs owned by this user (studios with a public `/w/{code}` code).
 * Used on `/dashboard` for customers created via the affiliate onboarding flow.
 */
export async function getUserAffiliatePrograms(userId: string): Promise<UserAffiliateProgramRow[]> {
  const studios = await prisma.studio.findMany({
    where: { ownerUserId: userId },
    select: {
      id: true,
      displayName: true,
      wearConfig: {
        select: { wearAffiliateCode: true, enabled: true, marginBps: true },
      },
      stripeAccount: {
        select: { chargesEnabled: true, payoutsEnabled: true },
      },
    },
  });

  const withCode = studios.filter(
    (s) => typeof s.wearConfig?.wearAffiliateCode === "string" && s.wearConfig.wearAffiliateCode.trim().length > 0,
  );
  if (withCode.length === 0) return [];

  const origin = siteMetadata.url.replace(/\/$/, "");
  const studioIds = withCode.map((s) => s.id);

  const [grouped, lastCredited] = await Promise.all([
    prisma.affiliateCommissionCredit.groupBy({
      by: ["studioId", "status"],
      where: { studioId: { in: studioIds } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.affiliateCommissionCredit.findMany({
      where: { studioId: { in: studioIds } },
      orderBy: { creditedAt: "desc" },
      select: { studioId: true, creditedAt: true },
    }),
  ]);

  const byStudio = new Map<
    string,
    { unpaid: number; payoutPending: number; paid: number; orders: number }
  >();
  for (const id of studioIds) {
    byStudio.set(id, { unpaid: 0, payoutPending: 0, paid: 0, orders: 0 });
  }
  for (const row of grouped) {
    const bucket = byStudio.get(row.studioId);
    if (!bucket) continue;
    const sum = row._sum.amountCents ?? 0;
    const count = row._count._all;
    if (row.status !== "void") bucket.orders += count;
    if (row.status === "pending") bucket.unpaid += sum;
    else if (row.status === "payout_pending") bucket.payoutPending += sum;
    else if (row.status === "paid") bucket.paid += sum;
  }

  const lastByStudio = new Map<string, Date>();
  for (const row of lastCredited) {
    if (!lastByStudio.has(row.studioId)) lastByStudio.set(row.studioId, row.creditedAt);
  }

  return withCode.map((s) => {
    const code = s.wearConfig!.wearAffiliateCode!.trim();
    const cfg = s.wearConfig!;
    const agg = byStudio.get(s.id)!;
    const stripe = s.stripeAccount;
    return {
      studioId: s.id,
      displayName: s.displayName,
      code,
      enabled: cfg.enabled,
      marginPercentLabel: marginLabel(cfg.marginBps),
      shareUrl: `${origin}/w/${encodeURIComponent(code)}`,
      stripePayoutsReady: Boolean(stripe?.chargesEnabled && stripe?.payoutsEnabled),
      referredOrders: agg.orders,
      unpaidCents: agg.unpaid,
      payoutPendingCents: agg.payoutPending,
      paidCents: agg.paid,
      lastSaleAt: lastByStudio.get(s.id)?.toISOString() ?? null,
    };
  });
}
