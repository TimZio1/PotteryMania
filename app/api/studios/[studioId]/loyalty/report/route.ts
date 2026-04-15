import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [balances, earnedCount, redeemedCount] = await Promise.all([
    prisma.loyaltyBalance.findMany({
      where: { studioId },
      orderBy: { pointsBalance: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, email: true, customerProfile: { select: { fullName: true } } } },
      },
    }),
    prisma.loyaltyTransaction.count({
      where: { balance: { studioId }, type: "earned_from_booking" },
    }),
    prisma.loyaltyTransaction.count({
      where: { balance: { studioId }, type: "redeemed_for_gift_card" },
    }),
  ]);

  const totals = balances.reduce(
    (acc, row) => {
      acc.balance += row.pointsBalance;
      acc.earned += row.totalEarned;
      acc.spent += row.totalSpent;
      return acc;
    },
    { balance: 0, earned: 0, spent: 0 },
  );

  return NextResponse.json({
    totals: {
      activeCustomers: balances.length,
      pointsBalance: totals.balance,
      pointsEarned: totals.earned,
      pointsSpent: totals.spent,
      earnedTransactions: earnedCount,
      redeemedTransactions: redeemedCount,
    },
    balances: balances.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      userEmail: entry.user.email,
      fullName: entry.user.customerProfile?.fullName ?? null,
      pointsBalance: entry.pointsBalance,
      totalEarned: entry.totalEarned,
      totalSpent: entry.totalSpent,
      updatedAt: entry.updatedAt,
    })),
  });
}
