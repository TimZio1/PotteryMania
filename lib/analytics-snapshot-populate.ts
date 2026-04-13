import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Writes one platform-scoped snapshot for `day` (Tier 4D).
 */
export async function writePlatformAnalyticsSnapshotForDay(day: Date): Promise<{ ok: true } | { ok: false; error: string }> {
  const start = utcDay(day);
  const end = new Date(start.getTime() + 86400000);

  const [
    ordersCount,
    ordersPaidCents,
    bookingsCount,
    bookingsDepositCents,
    newUsers,
    newStudiosApproved,
    insightRevenueCents,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: start, lt: end },
        paymentStatus: "paid",
      },
      _sum: { totalCents: true },
    }),
    prisma.booking.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.booking.aggregate({
      where: {
        createdAt: { gte: start, lt: end },
        paymentStatus: "paid",
      },
      _sum: { totalAmountCents: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.studio.count({
      where: { approvedAt: { gte: start, lt: end } },
    }),
    prisma.insightPurchase.aggregate({
      where: { createdAt: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
  ]);

  const metrics: Prisma.InputJsonValue = {
    ordersCount,
    ordersPaidTotalCents: ordersPaidCents._sum.totalCents ?? 0,
    bookingsCount,
    bookingsDepositTotalCents: bookingsDepositCents._sum.totalAmountCents ?? 0,
    newUsers,
    newStudiosApproved,
    insightPurchaseTotalCents: insightRevenueCents._sum.amountCents ?? 0,
  };

  const existing = await prisma.analyticsSnapshot.findFirst({
    where: { snapshotScope: "platform", studioId: null, snapshotDate: start },
    select: { id: true },
  });
  if (existing) {
    await prisma.analyticsSnapshot.update({ where: { id: existing.id }, data: { metrics } });
  } else {
    await prisma.analyticsSnapshot.create({
      data: {
        snapshotScope: "platform",
        studioId: null,
        snapshotDate: start,
        metrics,
      },
    });
  }

  return { ok: true };
}
