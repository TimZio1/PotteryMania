import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { allocateGiftCardCode } from "@/lib/gift-cards/code";

const POINTS_PER_EUR_CENT = 1;
const MIN_REDEEM_POINTS = 500;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const studioId = typeof body.studioId === "string" ? body.studioId : "";
  const points = typeof body.points === "number" ? Math.floor(body.points) : NaN;
  if (!studioId) return NextResponse.json({ error: "studioId is required" }, { status: 400 });
  if (!Number.isFinite(points) || points < MIN_REDEEM_POINTS) {
    return NextResponse.json({ error: `points must be at least ${MIN_REDEEM_POINTS}` }, { status: 400 });
  }

  const config = await prisma.loyaltyConfig.findUnique({
    where: { studioId },
    select: { isEnabled: true },
  });
  if (!config?.isEnabled) return NextResponse.json({ error: "Loyalty is not enabled for this studio" }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const balance = await tx.loyaltyBalance.findUnique({
      where: { userId_studioId: { userId: user.id, studioId } },
    });
    if (!balance || balance.pointsBalance < points) return null;

    const valueCents = Math.floor(points / POINTS_PER_EUR_CENT);
    if (valueCents < 500) return null;
    const code = await allocateGiftCardCode(tx);
    const now = new Date();
    const validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const giftCard = await tx.giftCard.create({
      data: {
        studioId,
        code,
        name: "Loyalty reward gift card",
        description: `Redeemed from ${points} loyalty points`,
        originalValueCents: valueCents,
        remainingValueCents: valueCents,
        currency: "EUR",
        validFrom: now,
        validUntil,
        purchaserUserId: user.id,
        purchaserName: user.email,
        purchaserEmail: user.email,
        recipientName: user.email,
        recipientEmail: user.email,
        issuedByAdmin: true,
        isActive: true,
      },
      select: { id: true, code: true, originalValueCents: true, validUntil: true },
    });

    await tx.loyaltyBalance.update({
      where: { id: balance.id },
      data: {
        pointsBalance: balance.pointsBalance - points,
        totalSpent: balance.totalSpent + points,
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        balanceId: balance.id,
        type: "redeemed_for_gift_card",
        points: -points,
        description: `Redeemed for gift card ${giftCard.code}`,
        giftCardId: giftCard.id,
      },
    });

    return giftCard;
  });

  if (!result) {
    return NextResponse.json({ error: "Not enough loyalty points to redeem" }, { status: 400 });
  }

  return NextResponse.json({ giftCard: result }, { status: 201 });
}
