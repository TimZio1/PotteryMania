import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true, status: true },
  });
  if (!studio || studio.ownerUserId !== userId) return null;
  return studio;
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const customerUserId = typeof body.customerUserId === "string" ? body.customerUserId : "";
  if (!customerUserId) return NextResponse.json({ error: "customerUserId is required" }, { status: 400 });
  const points = typeof body.points === "number" ? Math.floor(body.points) : NaN;
  if (!Number.isFinite(points) || points === 0) {
    return NextResponse.json({ error: "points must be a non-zero number" }, { status: 400 });
  }
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 500)
      : "Manual loyalty adjustment";

  const adjusted = await prisma.$transaction(async (tx) => {
    const balance = await tx.loyaltyBalance.upsert({
      where: { userId_studioId: { userId: customerUserId, studioId } },
      create: {
        userId: customerUserId,
        studioId,
        pointsBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
      },
      update: {},
    });
    const nextPointsBalance = Math.max(0, balance.pointsBalance + points);
    const spentDelta = points < 0 ? Math.min(balance.pointsBalance, Math.abs(points)) : 0;

    const updatedBalance = await tx.loyaltyBalance.update({
      where: { id: balance.id },
      data: {
        pointsBalance: nextPointsBalance,
        totalEarned: points > 0 ? balance.totalEarned + points : balance.totalEarned,
        totalSpent: points < 0 ? balance.totalSpent + spentDelta : balance.totalSpent,
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        balanceId: balance.id,
        type: "admin_adjustment",
        points,
        description,
        adminUserId: user.id,
      },
    });

    return updatedBalance;
  });

  return NextResponse.json({ balance: adjusted }, { status: 201 });
}
