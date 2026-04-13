import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadGiftCardByCode } from "@/lib/gift-cards/validate";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const result = await loadGiftCardByCode(prisma, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const giftCard = result.giftCard;
  return NextResponse.json({
    giftCard: {
      code: giftCard.code,
      name: giftCard.name,
      description: giftCard.description,
      originalValueCents: giftCard.originalValueCents,
      remainingValueCents: giftCard.remainingValueCents,
      currency: giftCard.currency,
      validFrom: giftCard.validFrom,
      validUntil: giftCard.validUntil,
      recipientName: giftCard.recipientName,
      purchaserName: giftCard.purchaserName,
      personalMessage: giftCard.personalMessage,
    },
  });
}
