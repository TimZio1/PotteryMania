import type { Prisma } from "@prisma/client";
import { commissionCentsFromLine, resolveCommissionBps } from "@/lib/commission";
import { depositChargedCents } from "@/lib/bookings/deposit";
import { seatTypeCapacityError, validateSeatTypeRequired } from "@/lib/bookings/seat-type";
import { cartItemInclude } from "@/lib/cart-server";

export type CartWithCheckoutItems = Prisma.CartGetPayload<{
  include: { items: { include: typeof cartItemInclude } };
}>;

export type CheckoutLineRow = {
  cartItemId: string;
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

export type BuildCheckoutLineOptions = {
  /** When the cart has multiple studios, pass the studio whose lines to build for Connect + order creation. */
  studioId?: string;
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
  | { ok: false; error: string; status: number; priceChanged?: boolean }
  | {
      ok: false;
      error: string;
      status: 409;
      multiVendorStudios: { id: string; displayName: string; itemCount: number }[];
    };

export async function buildCheckoutLineRowsFromCart(
  cart: CartWithCheckoutItems | null,
  options?: BuildCheckoutLineOptions,
): Promise<BuildLineRowsResult> {
  if (!cart?.items.length) {
    return { ok: false, error: "Cart empty", status: 400 };
  }

  const scopeStudio = options?.studioId?.trim() || null;
  const items = scopeStudio
    ? cart.items.filter((i) => i.vendorId === scopeStudio)
    : cart.items;

  if (scopeStudio && !items.length) {
    return { ok: false, error: "No cart lines for that studio", status: 400 };
  }

  const vendorIds = [...new Set(cart.items.map((i) => i.vendorId))];
  if (!scopeStudio && vendorIds.length > 1) {
    const counts = new Map<string, { displayName: string; itemCount: number }>();
    for (const i of cart.items) {
      const name = i.vendor?.displayName?.trim() || "Studio";
      const cur = counts.get(i.vendorId) ?? { displayName: name, itemCount: 0 };
      cur.itemCount += 1;
      counts.set(i.vendorId, cur);
    }
    return {
      ok: false,
      error: "Your cart has items from more than one studio. Check out each studio separately.",
      status: 409,
      multiVendorStudios: vendorIds.map((id) => {
        const c = counts.get(id)!;
        return { id, displayName: c.displayName, itemCount: c.itemCount };
      }),
    };
  }

  const studioId = items[0].vendorId;

  const productBps = await resolveCommissionBps(studioId, "product");
  const bookingBps = await resolveCommissionBps(studioId, "booking");

  let subtotal = 0;
  let commissionTotal = 0;
  let totalWeightGrams = 0;
  const lineRows: CheckoutLineRow[] = [];

  for (const item of items) {
    if (item.itemType === "product") {
      if (!item.productId || !item.product) {
        return { ok: false, error: "Invalid cart item", status: 400 };
      }
      const p = item.product;
      if (p.status !== "active" || p.studio.status !== "approved") {
        return { ok: false, error: `Product unavailable: ${p.title}`, status: 400 };
      }
      if (p.pricingType === "recurring") {
        return { ok: false, error: `Subscription product cannot be purchased as one-time: ${p.title}`, status: 409 };
      }
      if (p.stockStatus === "out_of_stock" || p.stockQuantity < item.quantity) {
        return {
          ok: false,
          error: `Not enough stock for "${p.title}" (available: ${Math.max(0, p.stockQuantity)})`,
          status: 400,
        };
      }
      const currentUnit = p.salePriceCents ?? p.priceCents;
      if (currentUnit !== item.priceSnapshotCents) {
        return {
          ok: false,
          error: `Price changed for "${p.title}". Refresh your cart and try again.`,
          status: 409,
          priceChanged: true,
        };
      }
      const unit = item.priceSnapshotCents;
      const lineCents = unit * item.quantity;
      const com = commissionCentsFromLine(lineCents, productBps);
      subtotal += lineCents;
      commissionTotal += com;
      totalWeightGrams += (p.weightGrams ?? 0) * item.quantity;
      lineRows.push({
        cartItemId: item.id,
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
    if (experience.pricingType === "recurring") {
      return { ok: false, error: `Subscription class cannot be booked as one-time: ${experience.title}`, status: 409 };
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

    if (experience.priceCents !== item.priceSnapshotCents) {
      return {
        ok: false,
        error: `Price changed for "${experience.title}". Refresh your cart and try again.`,
        status: 409,
        priceChanged: true,
      };
    }

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
      cartItemId: item.id,
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
