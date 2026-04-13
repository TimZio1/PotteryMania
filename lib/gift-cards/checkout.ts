import type { GiftCard, Prisma, PrismaClient } from "@prisma/client";
import { commissionCentsFromLine } from "@/lib/commission";
import type { CheckoutLineRow } from "@/lib/checkout-line-rows";
import { allocateDiscountAcrossLines, MIN_DISCOUNTED_SUBTOTAL_CENTS } from "@/lib/coupon-checkout";
import { normalizeGiftCardCode } from "@/lib/gift-cards/code";
import { loadGiftCardByCode } from "@/lib/gift-cards/validate";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const MIN_STRIPE_CHARGE_CENTS = MIN_DISCOUNTED_SUBTOTAL_CENTS;
export const GIFT_CARD_RESERVATION_WINDOW_MS = 30 * 60 * 1000;

export type GiftCardCheckoutPreview = {
  giftCard: GiftCard;
  appliedCents: number;
  subtotalAfterGiftCard: number;
};

function nowPlusReservationWindow(now: Date) {
  return new Date(now.getTime() + GIFT_CARD_RESERVATION_WINDOW_MS);
}

async function releaseGiftCardReservationRows(
  db: DbClient,
  reservations: Array<{ id: string; giftCardId: string; amountCents: number }>,
  now: Date,
) {
  if (reservations.length === 0) return;

  for (const reservation of reservations) {
    await db.giftCard.update({
      where: { id: reservation.giftCardId },
      data: {
        remainingValueCents: { increment: reservation.amountCents },
      },
    });
  }

  await db.giftCardRedemption.updateMany({
    where: {
      id: { in: reservations.map((reservation) => reservation.id) },
      redemptionState: "reserved",
    },
    data: {
      redemptionState: "released",
      releasedAt: now,
      reservedUntil: null,
    },
  });
}

export async function releaseExpiredGiftCardRedemptions(
  db: DbClient,
  input?: {
    giftCardId?: string;
    now?: Date;
  },
) {
  const now = input?.now ?? new Date();
  const reservations = await db.giftCardRedemption.findMany({
    where: {
      redemptionState: "reserved",
      reservedUntil: { lt: now },
      stripeCheckoutSessionId: null,
      ...(input?.giftCardId ? { giftCardId: input.giftCardId } : {}),
    },
    select: {
      id: true,
      giftCardId: true,
      amountCents: true,
    },
  });
  await releaseGiftCardReservationRows(db, reservations, now);
}

export async function previewGiftCardRedemption(
  db: DbClient,
  rawCode: string,
  subtotalCents: number,
  options?: { studioId?: string | null },
): Promise<
  | { ok: true; preview: GiftCardCheckoutPreview }
  | { ok: false; error: string; status: number }
> {
  const normalized = normalizeGiftCardCode(rawCode);
  const existing = normalized
    ? await db.giftCard.findUnique({
        where: { code: normalized },
        select: { id: true },
      })
    : null;
  if (existing) {
    await releaseExpiredGiftCardRedemptions(db, { giftCardId: existing.id });
  }
  const loaded = await loadGiftCardByCode(db, rawCode);
  if (!loaded.ok) return loaded;
  if (options?.studioId && loaded.giftCard.studioId !== options.studioId) {
    return {
      ok: false,
      error: "This gift card belongs to a different studio.",
      status: 400,
    };
  }

  const appliedCents = Math.min(loaded.giftCard.remainingValueCents, subtotalCents);
  if (appliedCents <= 0) {
    return { ok: false, error: "This gift card does not reduce this order.", status: 400 };
  }

  const subtotalAfterGiftCard = subtotalCents - appliedCents;
  if (subtotalAfterGiftCard > 0 && subtotalAfterGiftCard < MIN_STRIPE_CHARGE_CENTS) {
    return {
      ok: false,
      error: `After the gift card, the remaining amount must be at least €${(MIN_STRIPE_CHARGE_CENTS / 100).toFixed(2)}.`,
      status: 400,
    };
  }

  return {
    ok: true,
    preview: {
      giftCard: loaded.giftCard,
      appliedCents,
      subtotalAfterGiftCard,
    },
  };
}

export function applyGiftCardToLineRows(
  rows: CheckoutLineRow[],
  productBps: number,
  bookingBps: number,
  giftCardDiscountCents: number,
): CheckoutLineRow[] {
  if (giftCardDiscountCents <= 0) return rows;
  const allocations = allocateDiscountAcrossLines(
    rows.map((row) => row.chargedLineCents),
    giftCardDiscountCents,
  );

  return rows.map((row, index) => {
    const chargedLineCents = row.chargedLineCents - allocations[index];
    const bps = row.itemType === "product" ? productBps : bookingBps;
    const commissionCents = commissionCentsFromLine(chargedLineCents, bps);
    return {
      ...row,
      chargedLineCents,
      commissionCents,
      vendorCents: chargedLineCents - commissionCents,
    };
  });
}

export async function reserveGiftCardRedemption(
  db: DbClient,
  input: {
    giftCardId: string;
    orderId: string;
    bookingId?: string | null;
    redeemedByUserId?: string | null;
    amountCents: number;
    stripeCheckoutSessionId?: string | null;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  const reservedUntil = nowPlusReservationWindow(now);
  const releasable = await db.giftCardRedemption.findMany({
    where: {
      giftCardId: input.giftCardId,
      redemptionState: "reserved",
      OR: [
        { reservedUntil: { lt: now } },
        { orderId: input.orderId },
      ],
    },
    select: {
      id: true,
      giftCardId: true,
      amountCents: true,
    },
  });
  await releaseGiftCardReservationRows(db, releasable, now);

  const updated = await db.giftCard.updateMany({
    where: {
      id: input.giftCardId,
      remainingValueCents: { gte: input.amountCents },
    },
    data: {
      remainingValueCents: { decrement: input.amountCents },
    },
  });
  if (updated.count === 0) {
    throw new Error("GIFT_CARD_BALANCE_CONFLICT");
  }

  return db.giftCardRedemption.create({
    data: {
      giftCardId: input.giftCardId,
      orderId: input.orderId,
      bookingId: input.bookingId ?? null,
      redeemedByUserId: input.redeemedByUserId ?? null,
      amountCents: input.amountCents,
      redemptionState: "reserved",
      stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
      reservedUntil,
    },
  });
}

export async function attachGiftCardReservationsToSession(
  db: DbClient,
  input: {
    orderId: string;
    stripeCheckoutSessionId: string;
  },
) {
  await db.giftCardRedemption.updateMany({
    where: {
      orderId: input.orderId,
      redemptionState: "reserved",
      stripeCheckoutSessionId: null,
    },
    data: {
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    },
  });
}

export async function finalizeGiftCardRedemptionsForOrder(
  db: DbClient,
  input: {
    orderId: string;
    stripeCheckoutSessionId?: string | null;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  await db.giftCardRedemption.updateMany({
    where: {
      orderId: input.orderId,
      redemptionState: "reserved",
      ...(input.stripeCheckoutSessionId ? { stripeCheckoutSessionId: input.stripeCheckoutSessionId } : {}),
    },
    data: {
      redemptionState: "finalized",
      finalizedAt: now,
      reservedUntil: null,
    },
  });
}

export async function releaseGiftCardRedemptionsForSession(
  db: DbClient,
  input: {
    stripeCheckoutSessionId: string;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  const reservations = await db.giftCardRedemption.findMany({
    where: {
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      redemptionState: "reserved",
    },
    select: {
      id: true,
      giftCardId: true,
      amountCents: true,
    },
  });
  if (reservations.length === 0) return;
  await releaseGiftCardReservationRows(db, reservations, now);
}

export async function releaseGiftCardRedemptionsForOrder(
  db: DbClient,
  input: {
    orderId: string;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  const reservations = await db.giftCardRedemption.findMany({
    where: {
      orderId: input.orderId,
      redemptionState: "reserved",
    },
    select: {
      id: true,
      giftCardId: true,
      amountCents: true,
    },
  });
  if (reservations.length === 0) return;
  await releaseGiftCardReservationRows(db, reservations, now);
}
