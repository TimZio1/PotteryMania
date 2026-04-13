import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getCartForRequest, withCartCookie, cartItemInclude } from "@/lib/cart-server";
import { seatTypeCapacityError, validateSeatTypeRequired } from "@/lib/bookings/seat-type";
import { validateAndSnapshotAddOnSelections } from "@/lib/bookings/add-ons";
import { validateIntakeResponses } from "@/lib/intake-forms/validate-responses";
import { normalizeBookingPaymentPreference } from "@/lib/bookings/deposit";
import { getEligiblePackagePurchase } from "@/lib/packages/credits";
import { assertRateLimit } from "@/lib/rate-limit";
import { logApiError } from "@/lib/monitoring";

async function loadCart(cartId: string) {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: cartItemInclude,
      },
    },
  });
}

export async function GET() {
  const user = await getSessionUser();
  const { cartId, setCookie } = await getCartForRequest(user?.id ?? null);
  const cart = await loadCart(cartId);
  if (!cart) {
    return NextResponse.json({ error: "Cart missing" }, { status: 400 });
  }
  const res = NextResponse.json({ cart });
  return withCartCookie(res, setCookie);
}

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "cart:mutate", 50, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many cart updates" }, { status: 429 });
  }
  const user = await getSessionUser();
  const { cartId, setCookie } = await getCartForRequest(user?.id ?? null);

  let body: {
    productId?: string;
    quantity?: number;
    slotId?: string;
    participantCount?: number;
    bookingPaymentPreference?: "deposit" | "full";
    classPackagePurchaseId?: string | null;
    seatType?: string | null;
    notes?: string | null;
    addOnSelections?: unknown;
    intakeResponses?: unknown;
  };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("cart_post_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const productId = typeof body.productId === "string" ? body.productId : "";
  const slotId = typeof body.slotId === "string" ? body.slotId : "";
  const quantity = typeof body.quantity === "number" && body.quantity > 0 ? Math.floor(body.quantity) : 1;
  const participantCount =
    typeof body.participantCount === "number" && body.participantCount > 0 ? Math.floor(body.participantCount) : 1;
  const notes =
    typeof body.notes === "string"
      ? body.notes.trim().slice(0, 1000) || null
      : body.notes === null
        ? null
        : undefined;
  const bookingPaymentPreference =
    body.bookingPaymentPreference === "full"
      ? "full"
      : body.bookingPaymentPreference === "deposit"
        ? "deposit"
        : undefined;
  const classPackagePurchaseId =
    body.classPackagePurchaseId === null
      ? null
      : typeof body.classPackagePurchaseId === "string"
        ? body.classPackagePurchaseId.trim() || null
        : undefined;
  if (!productId && !slotId) {
    return NextResponse.json({ error: "productId or slotId required" }, { status: 400 });
  }

  const existingItems = await prisma.cartItem.findMany({
    where: { cartId },
    include: { product: true, slot: true, experience: true },
  });

  if (productId) {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: "active",
        studio: { status: "approved" },
      },
    });
    if (!product) return NextResponse.json({ error: "Product not available" }, { status: 400 });
    if (product.pricingType === "recurring") {
      return NextResponse.json({ error: "This offering is subscription-based. Use subscription checkout." }, { status: 409 });
    }

    const unit = product.salePriceCents ?? product.priceCents;
    const same = existingItems.find((i) => i.itemType === "product" && i.productId === productId);
    if (same) {
      await prisma.cartItem.update({
        where: { id: same.id },
        data: { quantity: same.quantity + quantity, priceSnapshotCents: unit },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId,
          itemType: "product",
          productId,
          vendorId: product.studioId,
          quantity,
          priceSnapshotCents: unit,
        },
      });
    }
  } else {
    const slot = await prisma.bookingSlot.findUnique({
      where: { id: slotId },
      include: {
        experience: { include: { studio: true, cancellationPolicy: true } },
      },
    });
    if (!slot?.experience) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

    const experience = slot.experience;
    if (experience.status !== "active" || experience.visibility !== "public" || experience.studio.status !== "approved") {
      return NextResponse.json({ error: "Experience not available" }, { status: 400 });
    }
    if (experience.pricingType === "recurring") {
      return NextResponse.json({ error: "This class is subscription-based. Start membership checkout instead." }, { status: 409 });
    }
    if (slot.status !== "open") {
      return NextResponse.json({ error: "Slot not bookable" }, { status: 400 });
    }
    const cutoffMs = (experience.bookingCutoffHours ?? 0) * 3600_000;
    if (cutoffMs > 0) {
      const dateStr = slot.slotDate.toISOString().slice(0, 10);
      const slotStartMs = new Date(`${dateStr}T${slot.startTime}:00`).getTime();
      if (slotStartMs - Date.now() < cutoffMs) {
        return NextResponse.json({ error: `Bookings close ${experience.bookingCutoffHours}h before the session` }, { status: 400 });
      }
    }
    if (participantCount < experience.minimumParticipants || participantCount > experience.maximumParticipants) {
      return NextResponse.json({ error: "Invalid participant count for this experience" }, { status: 400 });
    }

    const same = existingItems.find((i) => i.itemType === "booking" && i.slotId === slotId);
    const reservedBySame = same?.participantCount ?? 0;
    const remaining = slot.capacityTotal - slot.capacityReserved + reservedBySame;
    if (participantCount > remaining) {
      return NextResponse.json({ error: "Not enough capacity" }, { status: 400 });
    }

    const seatType = typeof body.seatType === "string" && body.seatType.trim() ? body.seatType.trim() : null;
    const stErr = validateSeatTypeRequired(slot.seatCapacities, seatType);
    if (stErr) return NextResponse.json({ error: stErr }, { status: 400 });
    const seatErr = seatTypeCapacityError(slot.seatCapacities, seatType, participantCount, reservedBySame);
    if (seatErr) return NextResponse.json({ error: seatErr }, { status: 400 });

    const effectiveBookingPaymentPreference = normalizeBookingPaymentPreference(bookingPaymentPreference, {
      bookingDepositBps: experience.bookingDepositBps,
      allowFullPaymentOption: experience.allowFullPaymentOption,
    });
    const eligiblePackage = classPackagePurchaseId
      ? await prisma.$transaction((tx) =>
          getEligiblePackagePurchase(tx, {
            purchaseId: classPackagePurchaseId,
            userId: user?.id ?? "",
            studioId: experience.studioId,
            experienceId: experience.id,
          }),
        )
      : null;
    if (classPackagePurchaseId && !user?.id) {
      return NextResponse.json({ error: "Sign in to use class package credits" }, { status: 401 });
    }
    if (classPackagePurchaseId && !eligiblePackage) {
      return NextResponse.json({ error: "Selected package credit is not valid for this class" }, { status: 400 });
    }
    const policySnapshot = experience.cancellationPolicy
      ? {
          id: experience.cancellationPolicy.id,
          name: experience.cancellationPolicy.name,
          policyType: experience.cancellationPolicy.policyType,
          hoursBeforeStart: experience.cancellationPolicy.hoursBeforeStart,
          refundPercentage: experience.cancellationPolicy.refundPercentage,
          customPolicyText: experience.cancellationPolicy.customPolicyText,
        }
      : undefined;
    const addOnResult = await validateAndSnapshotAddOnSelections(prisma, experience.id, body.addOnSelections);
    if (!addOnResult.ok) {
      return NextResponse.json({ error: addOnResult.error, ...(addOnResult.priceChanged ? { priceChanged: true } : {}) }, { status: addOnResult.priceChanged ? 409 : 400 });
    }
    const intakeResult = await validateIntakeResponses(prisma, experience.id, body.intakeResponses);
    if (!intakeResult.ok) {
      return NextResponse.json({ error: intakeResult.error }, { status: 400 });
    }
    if (same) {
      await prisma.cartItem.update({
        where: { id: same.id },
        data: {
          quantity: 1,
          participantCount,
          bookingPaymentPreference: effectiveBookingPaymentPreference,
          ...(classPackagePurchaseId !== undefined
            ? { classPackagePurchaseId: eligiblePackage?.purchase.id ?? null }
            : {}),
          seatType,
          ...(notes !== undefined ? { notes } : {}),
          addOnSelections: addOnResult.selections as unknown as object,
          intakeResponsePayload: intakeResult.responses as unknown as object,
          priceSnapshotCents: experience.priceCents,
          policySnapshot,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId,
          itemType: "booking",
          experienceId: experience.id,
          slotId: slot.id,
          vendorId: experience.studioId,
          quantity: 1,
          participantCount,
          bookingPaymentPreference: effectiveBookingPaymentPreference,
          classPackagePurchaseId: eligiblePackage?.purchase.id ?? null,
          seatType,
          notes: notes ?? null,
          addOnSelections: addOnResult.selections as unknown as object,
          intakeResponsePayload: intakeResult.responses as unknown as object,
          priceSnapshotCents: experience.priceCents,
          policySnapshot,
        },
      });
    }
  }

  const cart = await loadCart(cartId);
  const res = NextResponse.json({ cart });
  return withCartCookie(res, setCookie);
}

export async function PATCH(req: Request) {
  const rate = assertRateLimit(req, "cart:mutate", 50, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many cart updates" }, { status: 429 });
  }
  const user = await getSessionUser();
  const { cartId, setCookie } = await getCartForRequest(user?.id ?? null);

  let body: {
    itemId?: string;
    quantity?: number;
    participantCount?: number;
    bookingPaymentPreference?: "deposit" | "full";
    classPackagePurchaseId?: string | null;
    seatType?: string | null;
    notes?: string | null;
    addOnSelections?: unknown;
    intakeResponses?: unknown;
  };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("cart_patch_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const quantity = typeof body.quantity === "number" ? Math.floor(body.quantity) : 0;
  const hasParticipantCount = "participantCount" in body;
  const participantCountRaw =
    typeof body.participantCount === "number" ? Math.floor(body.participantCount) : 0;
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId },
    include: {
      experience: true,
      slot: true,
    },
  });
  const seatTypePatch =
    body.seatType === null
      ? null
      : typeof body.seatType === "string" && body.seatType.trim()
        ? body.seatType.trim()
        : undefined;
  const notesPatch =
    body.notes === null
      ? null
      : typeof body.notes === "string"
        ? body.notes.trim().slice(0, 1000) || null
        : undefined;
  const bookingPaymentPreferencePatch =
    body.bookingPaymentPreference === "full"
      ? "full"
      : body.bookingPaymentPreference === "deposit"
        ? "deposit"
        : undefined;
  const classPackagePurchaseIdPatch =
    body.classPackagePurchaseId === null
      ? null
      : typeof body.classPackagePurchaseId === "string"
        ? body.classPackagePurchaseId.trim() || null
        : undefined;
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (item.itemType === "booking") {
    if (hasParticipantCount && participantCountRaw <= 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      const participantCount =
        hasParticipantCount && participantCountRaw > 0
          ? participantCountRaw
          : item.participantCount ?? 1;
      const slot = await prisma.bookingSlot.findUnique({
        where: { id: item.slotId ?? "" },
        include: { experience: true },
      });
      if (!slot?.experience) {
        return NextResponse.json({ error: "Slot not found" }, { status: 404 });
      }
      if (
        participantCount < slot.experience.minimumParticipants ||
        participantCount > slot.experience.maximumParticipants
      ) {
        return NextResponse.json({ error: "Invalid participant count for this experience" }, { status: 400 });
      }
      const currentReserved = item.participantCount ?? 0;
      const remaining = slot.capacityTotal - slot.capacityReserved + currentReserved;
      if (participantCount > remaining) {
        return NextResponse.json({ error: "Not enough capacity" }, { status: 400 });
      }
      const nextSeat =
        seatTypePatch !== undefined ? seatTypePatch : item.seatType ?? null;
      const stErr = validateSeatTypeRequired(slot.seatCapacities, nextSeat);
      if (stErr) return NextResponse.json({ error: stErr }, { status: 400 });
      const seatErr = seatTypeCapacityError(slot.seatCapacities, nextSeat, participantCount, currentReserved);
      if (seatErr) return NextResponse.json({ error: seatErr }, { status: 400 });
      const addOnResult = await validateAndSnapshotAddOnSelections(prisma, slot.experience.id, body.addOnSelections ?? item.addOnSelections);
      if (!addOnResult.ok) {
        return NextResponse.json({ error: addOnResult.error, ...(addOnResult.priceChanged ? { priceChanged: true } : {}) }, { status: addOnResult.priceChanged ? 409 : 400 });
      }
      const intakeResult = await validateIntakeResponses(prisma, slot.experience.id, body.intakeResponses ?? item.intakeResponsePayload);
      if (!intakeResult.ok) {
        return NextResponse.json({ error: intakeResult.error }, { status: 400 });
      }
      const effectiveBookingPaymentPreference = normalizeBookingPaymentPreference(
        bookingPaymentPreferencePatch ?? item.bookingPaymentPreference ?? undefined,
        {
          bookingDepositBps: slot.experience.bookingDepositBps,
          allowFullPaymentOption: slot.experience.allowFullPaymentOption,
        },
      );
      if (classPackagePurchaseIdPatch && !user?.id) {
        return NextResponse.json({ error: "Sign in to use class package credits" }, { status: 401 });
      }
      const eligiblePackage = classPackagePurchaseIdPatch
        ? await prisma.$transaction((tx) =>
            getEligiblePackagePurchase(tx, {
              purchaseId: classPackagePurchaseIdPatch,
              userId: user?.id ?? "",
              studioId: slot.experience.studioId,
              experienceId: slot.experience.id,
            }),
          )
        : null;
      if (classPackagePurchaseIdPatch && !eligiblePackage) {
        return NextResponse.json({ error: "Selected package credit is not valid for this class" }, { status: 400 });
      }
      await prisma.cartItem.update({
        where: { id: itemId },
        data: {
          quantity: 1,
          participantCount,
          bookingPaymentPreference: effectiveBookingPaymentPreference,
          ...(classPackagePurchaseIdPatch !== undefined
            ? { classPackagePurchaseId: eligiblePackage?.purchase.id ?? null }
            : {}),
          ...(seatTypePatch !== undefined ? { seatType: nextSeat } : {}),
          ...(notesPatch !== undefined ? { notes: notesPatch } : {}),
          ...("addOnSelections" in body ? { addOnSelections: addOnResult.selections as unknown as object } : {}),
          ...("intakeResponses" in body ? { intakeResponsePayload: intakeResult.responses as unknown as object } : {}),
          priceSnapshotCents: slot.experience.priceCents,
        },
      });
    }
  } else if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  const cart = await loadCart(cartId);
  const res = NextResponse.json({ cart });
  return withCartCookie(res, setCookie);
}

export async function DELETE(req: Request) {
  const rate = assertRateLimit(req, "cart:mutate", 50, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many cart updates" }, { status: 429 });
  }
  const user = await getSessionUser();
  const { cartId, setCookie } = await getCartForRequest(user?.id ?? null);
  await prisma.cartItem.deleteMany({ where: { cartId } });
  const cart = await loadCart(cartId);
  const res = NextResponse.json({ cart });
  return withCartCookie(res, setCookie);
}