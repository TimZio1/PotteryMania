import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFinanceAdmin } from "@/lib/finance/admin-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await requireFinanceAdmin();
  if (!g.ok) return g.response;

  const plans = await prisma.billingPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { subscriptions: true } },
    },
  });

  const mrrCents = await prisma.subscription.count({
    where: { status: "active" },
  });

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      priceCents: p.priceCents,
      interval: p.interval,
      activeSubscribers: p._count.subscriptions,
    })),
    mrrNote:
      mrrCents === 0
        ? "No active subscriptions yet — MRR will populate when BillingPlan + Subscription are used."
        : "MRR requires summing active subscription prices (extend when billing goes live).",
    activeSubscriptionCount: mrrCents,
  });
}
