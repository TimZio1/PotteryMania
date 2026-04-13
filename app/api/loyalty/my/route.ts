import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const balances = await prisma.loyaltyBalance.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      studio: { select: { id: true, displayName: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          type: true,
          points: true,
          description: true,
          createdAt: true,
          bookingId: true,
          giftCardId: true,
        },
      },
    },
  });

  return NextResponse.json({
    balances: balances.map((entry) => ({
      id: entry.id,
      studio: entry.studio,
      pointsBalance: entry.pointsBalance,
      totalEarned: entry.totalEarned,
      totalSpent: entry.totalSpent,
      updatedAt: entry.updatedAt,
      transactions: entry.transactions,
    })),
  });
}
