import type { Prisma } from "@prisma/client";
import { commissionCentsFromLine, resolveCommissionBps } from "@/lib/commission";
import { depositChargedCents } from "@/lib/bookings/deposit";
import { seatTypeCapacityError, validateSeatTypeRequired } from "@/lib/bookings/seat-type";
import { cartItemInclude } from "@/lib/cart-server";

export type CartWithCheckoutItems = Prisma.CartGetPayload<{
  include: { items: { include: typeof cartItemInclude } };
}>;

export type CheckoutLineRow = {
  itemType: "product" | "booking";
  title: string;
  stripeName: string;
  quantity: number;
  stripeQuantity: number;
  stripeUnitCents: number;
  productId?: string;
  experienceId?: string;
  slotId?: string;
  participantCount?: number;
  seatType?: string | null;
  policySnapshot?: Prisma.InputJsonValue;
  fullLineCents: number;
  chargedLineCents: number;
  commissionCents: number;
  vendorCents: number;
};

export type BuildLineRowsResult =
  | {
      ok: true;
      studioId: string;
      lineRows: CheckoutLineRow[];
      subtotal: number;
      commissionTotal: number;
      totalWeightGrams: number;
      productBps: number;
      bookingBps: number;
    }
  | { ok: false; error: string; status: number };

export async function buildCheckoutLineRowsFromCart(cart: CartWithCheckoutItems | null): Promise<BuildLineRowsResult> {
  if (!cart?.items.length) {
    return { ok: false, error: "Cart empty", status: 400 };
  }

  const studioId = cart.items[0].vendorId;
  if (cart.items.some((i) => i.vendorId !== studioId)) {
    return { ok: false, error: "Mixed vendors", status: 400 };
  }

  const productBps = await resolveCommissionBps(studioId, "product");
  const bookingBps = await resolveCommissionBps(studioId, "booking");

  let subtotal = 0;
  let commissionTotal = 0;
  let totalWeightGrams = 0;
  const lineRows: CheckoutLineRow[] = [];

  for (const item of cart.items) {
    if (item.itemType === "product") {
      if (!item.productId || !item.product) {
        return { ok: false, error: "Invalid cart item", status: 400 };
      }
      const p = item.product;
      if (p.status !== "active" || p.studio.status !== "approved") {
        return { ok: false, error: `Product unavailable: ${p.title}`, status: 400 };
      }
      if (p.stockStatus === "out_of_stock" || p.stockQuantity < item.quantity) {
        return {
          ok: false,
          error: `Not enough stock for "${p.title}" (available: ${Math.max(0, p.stockQuantity)})`,
          status: 400,
        };
      }
      const unit = item.priceSnapshotCents;
      const lineCents = unit * item.quantity;
      const com = commissionCentsFromLine(lineCents, productBps);
      subtotal += lineCents;
      commissionTotal += com;
      totalWeightGrams += (p.weightGrams ?? 0) * item.quantity;
      lineRows.push({
        itemType: "product",
        title: p.title,
        stripeName: p.title,
        quantity: item.quantity,
        stripeQuantity: item.quantity,
        stripeUnitCents: unit,
        productId: p.id,
        fullLineCents: lineCents,
        chargedLineCents: lineCents,
        commissionCents: com,
        vendorCents: lineCents - com,
      });
      continue;
    }

    if (!item.experienceId || !item.slotId || !item.experience || !item.slot || !item.participantCount) {
      return { ok: false, error: "Invalid booking cart item", status: 400 };
    }

    const experience = item.experience;
    const slot = item.slot;
    if (experience.status !== "active" || experience.visibility !== "public" || experience.studio.status !== "approved") {
      return { ok: false, error: `Experience unavailable: ${experience.title}`, status: 400 };
    }
    if (slot.status !== "open") {
      return { ok: false, error: `Slot no longer bookable: ${experience.title}`, status: 400 };
    }
    if (
      item.participantCount < experience.minimumParticipants ||
      item.participantCount > experience.maximumParticipants
    ) {
      return { ok: false, error: `Invalid participant count: ${experience.title}`, status: 400 };
    }

    const stErr = validateSeatTypeRequired(slot.seatCapacities, item.seatType);
    if (stErr) return { ok: false, error: stErr, status: 400 };

    const reservedBySame = item.participantCount ?? 0;
    const remaining = slot.capacityTotal - slot.capacityReserved + reservedBySame;
    if (item.participantCount > remaining) {
      return { ok: false, error: `Not enough capacity: ${experience.title}`, status: 400 };
    }

    const seatErr = seatTypeCapacityError(
      slot.seatCapacities,
      item.seatType ?? null,
      item.participantCount,
      reservedBySame,
    );
    if (seatErr) return { ok: false, error: seatErr, status: 400 };

    const unit = item.priceSnapshotCents;
    const fullLine = unit * item.participantCount;
    const charged = depositChargedCents(fullLine, experience.bookingDepositBps);
    const com = commissionCentsFromLine(charged, bookingBps);
    subtotal += charged;
    commissionTotal += com;

    const isDeposit = charged < fullLine;
    const stripeName = isDeposit
      ? `${experience.title} — deposit (${item.participantCount} pax)`
      : `${experience.title} (per person)`;

    lineRows.push({
      itemType: "booking",
      title: experience.title,
      stripeName,
      quantity: item.participantCount,
      stripeQuantity: isDeposit ? 1 : item.participantCount,
      stripeUnitCents: isDeposit ? charged : unit,
      experienceId: experience.id,
      slotId: slot.id,
      participantCount: item.participantCount,
      seatType: item.seatType ?? null,
      policySnapshot: (item.policySnapshot as Prisma.InputJsonValue | null) ?? undefined,
      fullLineCents: fullLine,
      chargedLineCents: charged,
      commissionCents: com,
      vendorCents: charged - com,
    });
  }

  return {
    ok: true,
    studioId,
    lineRows,
    subtotal,
    commissionTotal,
    totalWeightGrams,
    productBps,
    bookingBps,
  };
}
