import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== userId) return false;
  return true;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
