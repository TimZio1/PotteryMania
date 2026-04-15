import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { commissionCentsFromLine, resolveCommissionBps } from "@/lib/commission";
import { bookingChargeNowCents, normalizeBookingPaymentPreference } from "@/lib/bookings/deposit";
import { seatTypeCapacityError, validateSeatTypeRequired } from "@/lib/bookings/seat-type";
import { validateAndSnapshotAddOnSelections, type AddOnSelectionSnapshot } from "@/lib/bookings/add-ons";
import { validateIntakeResponses, type IntakeResponseSnapshot } from "@/lib/intake-forms/validate-responses";
import { cartItemInclude } from "@/lib/cart-server";
import { getEligiblePackagePurchase } from "@/lib/packages/credits";

export type CartWithCheckoutItems = Prisma.CartGetPayload<{
  include: { items: { include: typeof cartItemInclude } };
}>;

export type CheckoutLineRow = {
  cartItemId: string;
  itemType: "product" | "booking";
  bookingPaymentPreference?: "deposit" | "full";
  title: string;
  stripeName: string;
  quantity: number;
  stripeQuantity: number;
  stripeUnitCents: number;
  productId?: string;
  variantId?: string | null;
  variantName?: string | null;
  experienceId?: string;
  slotId?: string;
  participantCount?: number;
  seatType?: string | null;
  notes?: string | null;
  addOnSelections?: AddOnSelectionSnapshot[];
  intakeResponses?: IntakeResponseSnapshot[];
  policySnapshot?: Prisma.InputJsonValue;
  classPackagePurchaseId?: string | null;
  instructorId?: string | null;
  classPackageCreditsToUse?: number;
  fullLineCents: number;
  originalChargedLineCents: number;
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
      const productVariants = p.variants ?? [];
      if (p.status !== "active" || p.studio.status !== "approved") {
        return { ok: false, error: `Product unavailable: ${p.title}`, status: 400 };
      }
      if (p.pricingType === "recurring") {
        return { ok: false, error: `Subscription product cannot be purchased as one-time: ${p.title}`, status: 409 };
      }
      const variant = item.variantId
        ? item.variant ?? productVariants.find((row) => row.id === item.variantId) ?? null
        : null;
      if (productVariants.length > 0 && !item.variantId) {
        return { ok: false, error: `Variant is required for "${p.title}"`, status: 409 };
      }
      if (item.variantId && !variant) {
        return { ok: false, error: `Selected variant no longer exists for "${p.title}"`, status: 409 };
      }
      if (variant) {
        if (variant.stockQuantity != null && variant.stockQuantity < item.quantity) {
          return {
            ok: false,
            error: `Not enough stock for "${p.title} — ${variant.name}" (available: ${Math.max(0, variant.stockQuantity)})`,
            status: 400,
          };
        }
      } else if (p.stockStatus === "out_of_stock" || p.stockQuantity < item.quantity) {
        return {
          ok: false,
          error: `Not enough stock for "${p.title}" (available: ${Math.max(0, p.stockQuantity)})`,
          status: 400,
        };
      }
      const currentUnit = variant?.priceCents ?? p.salePriceCents ?? p.priceCents;
      if (currentUnit !== item.priceSnapshotCents) {
        return {
          ok: false,
          error: `Price changed for "${variant ? `${p.title} — ${variant.name}` : p.title}". Refresh your cart and try again.`,
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
        title: variant ? `${p.title} — ${variant.name}` : p.title,
        stripeName: variant ? `${p.title} — ${variant.name}` : p.title,
        quantity: item.quantity,
        stripeQuantity: item.quantity,
        stripeUnitCents: unit,
        productId: p.id,
        variantId: variant?.id ?? null,
        variantName: variant?.name ?? null,
        fullLineCents: lineCents,
        originalChargedLineCents: lineCents,
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
    const cutoffMs = (experience.bookingCutoffHours ?? 0) * 3600_000;
    if (cutoffMs > 0) {
      const dateStr = slot.slotDate.toISOString().slice(0, 10);
      const slotStartMs = new Date(`${dateStr}T${slot.startTime}:00`).getTime();
      if (slotStartMs - Date.now() < cutoffMs) {
        return { ok: false, error: `Bookings closed for "${experience.title}"`, status: 400 };
      }
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

    const addOnValidation = await validateAndSnapshotAddOnSelections(
      prisma,
      experience.id,
      item.addOnSelections,
    );
    if (!addOnValidation.ok) {
      return {
        ok: false,
        error: addOnValidation.error,
        status: addOnValidation.priceChanged ? 409 : 400,
        ...(addOnValidation.priceChanged ? { priceChanged: true } : {}),
      };
    }
    const intakeValidation = await validateIntakeResponses(
      prisma,
      experience.id,
      item.intakeResponsePayload,
    );
    if (!intakeValidation.ok) {
      return { ok: false, error: intakeValidation.error, status: 400 };
    }

    if (experience.priceCents !== item.priceSnapshotCents) {
      return {
        ok: false,
        error: `Price changed for "${experience.title}". Refresh your cart and try again.`,
        status: 409,
        priceChanged: true,
      };
    }

    let validatedInstructorId: string | null = null;
    if (item.instructorId) {
      const instructorLink = await prisma.instructorExperienceLink.findFirst({
        where: {
          instructorId: item.instructorId,
          experienceId: experience.id,
          instructor: {
            studioId,
            isActive: true,
          },
        },
        select: { instructorId: true },
      });
      if (!instructorLink) {
        return {
          ok: false,
          error: `Selected instructor is no longer available for "${experience.title}"`,
          status: 409,
        };
      }
      validatedInstructorId = instructorLink.instructorId;
    }

    const baseParticipantsCents = item.priceSnapshotCents * item.participantCount;
    const fullLine = baseParticipantsCents + addOnValidation.totalCents;
    let classPackagePurchaseId: string | null = null;
    let classPackageCreditsToUse: number | undefined;
    if (item.classPackagePurchaseId) {
      if (!cart.userId) {
        return { ok: false, error: "Sign in to use package credits", status: 401 };
      }
      const eligible = await prisma.$transaction((tx) =>
        getEligiblePackagePurchase(tx, {
          purchaseId: item.classPackagePurchaseId!,
          userId: cart.userId!,
          studioId,
          experienceId: experience.id,
        }),
      );
      if (!eligible) {
        return { ok: false, error: "Selected package no longer applies to this class", status: 409 };
      }
      classPackagePurchaseId = eligible.purchase.id;
      classPackageCreditsToUse = eligible.creditsToUse;
    }

    const payableLine = classPackagePurchaseId ? addOnValidation.totalCents : fullLine;
    const bookingPaymentPreference = classPackagePurchaseId
      ? "full"
      : normalizeBookingPaymentPreference(item.bookingPaymentPreference ?? undefined, {
          bookingDepositBps: experience.bookingDepositBps,
          allowFullPaymentOption: experience.allowFullPaymentOption,
        });
    const charged = classPackagePurchaseId
      ? payableLine
      : bookingChargeNowCents(
          payableLine,
          {
            bookingDepositBps: experience.bookingDepositBps,
            allowFullPaymentOption: experience.allowFullPaymentOption,
          },
          bookingPaymentPreference,
        );
    const com = commissionCentsFromLine(charged, bookingBps);
    subtotal += charged;
    commissionTotal += com;

    const isDeposit = !classPackagePurchaseId && charged < payableLine;
    const addOnSuffix = addOnValidation.selections.length
      ? ` + ${addOnValidation.selections.map((selection) => (selection.quantity > 1 ? `${selection.name} x${selection.quantity}` : selection.name)).join(", ")}`
      : "";
    const stripeName = classPackagePurchaseId
      ? `${experience.title}${addOnSuffix} — package credit`
      : isDeposit
        ? `${experience.title}${addOnSuffix} — deposit (${item.participantCount} pax)`
        : `${experience.title}${addOnSuffix}`;

    lineRows.push({
      cartItemId: item.id,
      itemType: "booking",
      bookingPaymentPreference,
      title: experience.title,
      stripeName,
      quantity: item.participantCount,
      stripeQuantity: 1,
      stripeUnitCents: charged,
      experienceId: experience.id,
      slotId: slot.id,
      participantCount: item.participantCount,
      seatType: item.seatType ?? null,
      notes: item.notes ?? null,
      addOnSelections: addOnValidation.selections,
      intakeResponses: intakeValidation.responses,
      policySnapshot: (item.policySnapshot as Prisma.InputJsonValue | null) ?? undefined,
      classPackagePurchaseId,
      instructorId: validatedInstructorId,
      classPackageCreditsToUse,
      fullLineCents: payableLine,
      originalChargedLineCents: charged,
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
