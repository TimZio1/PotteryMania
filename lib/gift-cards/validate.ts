import type { GiftCard, Prisma, PrismaClient } from "@prisma/client";
import { normalizeGiftCardCode } from "@/lib/gift-cards/code";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type GiftCardState =
  | { ok: true; giftCard: GiftCard }
  | { ok: false; error: string; status: number };

export function validateGiftCardState(giftCard: GiftCard, now = new Date()): GiftCardState {
  if (!giftCard.isActive) {
    return { ok: false, error: "This gift card is inactive.", status: 400 };
  }
  if (!giftCard.activatedAt) {
    return { ok: false, error: "This gift card has not been activated yet.", status: 409 };
  }
  if (giftCard.validFrom > now) {
    return { ok: false, error: "This gift card is not valid yet.", status: 400 };
  }
  if (giftCard.validUntil && giftCard.validUntil < now) {
    return { ok: false, error: "This gift card has expired.", status: 400 };
  }
  if (giftCard.remainingValueCents <= 0) {
    return { ok: false, error: "This gift card has no remaining balance.", status: 400 };
  }
  return { ok: true, giftCard };
}

export async function loadGiftCardByCode(
  db: DbClient,
  rawCode: string,
): Promise<GiftCardState> {
  const code = normalizeGiftCardCode(rawCode);
  if (!code) {
    return { ok: false, error: "Invalid gift card code.", status: 400 };
  }
  const giftCard = await db.giftCard.findUnique({
    where: { code },
  });
  if (!giftCard) {
    return { ok: false, error: "Gift card not found.", status: 404 };
  }
  return validateGiftCardState(giftCard);
}
