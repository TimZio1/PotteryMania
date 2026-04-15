import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const user = auth.user;

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { status: true },
  });
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
