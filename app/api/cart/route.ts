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
import { calculateWearPrice, resolveStudioMarginBps, resolveWearGlobalPricing } from "@/lib/wear-commission";

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
    variantId?: string | null;
    wearProductId?: string;
    wearProductVariantId?: string | null;
    studioId?: string;
    quantity?: number;
    slotId?: string;
    participantCount?: number;
    bookingPaymentPreference?: "deposit" | "full";
    classPackagePurchaseId?: string | null;
    instructorId?: string | null;
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
  const wearProductId = typeof body.wearProductId === "string" ? body.wearProductId.trim() : "";
  const variantId =
    body.variantId === null
      ? null
      : typeof body.variantId === "string"
        ? body.variantId.trim() || null
        : undefined;
  const wearProductVariantId =
    body.wearProductVariantId === null
      ? null
      : typeof body.wearProductVariantId === "string"
        ? body.wearProductVariantId.trim() || null
        : undefined;
  const studioId = typeof body.studioId === "string" ? body.studioId.trim() : "";
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
  const instructorId =
    body.instructorId === null
      ? null
      : typeof body.instructorId === "string"
        ? body.instructorId.trim() || null
        : undefined;
  if (!productId && !slotId && !wearProductId) {
    return NextResponse.json({ error: "productId, wearProductId or slotId required" }, { status: 400 });
  }

  const existingItems = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      product: { include: { variants: true } },
      variant: true,
      wearProduct: { include: { variants: true } },
      wearProductVariant: true,
      slot: true,
      experience: true,
    },
  });

  if (wearProductId) {
    if (!studioId) {
      return NextResponse.json({ error: "studioId is required for studio wearables" }, { status: 400 });
    }

    const [studio, wearConfig, wearProduct, globalPricing] = await Promise.all([
      prisma.studio.findFirst({
        where: { id: studioId, status: "approved" },
        select: { id: true },
      }),
      prisma.studioWearConfig.findUnique({
        where: { studioId },
        select: { enabled: true, marginBps: true },
      }),
      prisma.wearProduct.findFirst({
        where: {
          id: wearProductId,
          isActive: true,
          archivedAt: null,
          studioWearProducts: { some: { studioId } },
        },
        include: {
          variants: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
          },
        },
      }),
      resolveWearGlobalPricing(),
    ]);

    if (!studio || !wearConfig?.enabled) {
      return NextResponse.json({ error: "Studio wearables are not available" }, { status: 400 });
    }
    if (!wearProduct) {
      return NextResponse.json({ error: "Wearable not available" }, { status: 400 });
    }

    const hasVariants = wearProduct.variants.length > 0;
    if (hasVariants && !wearProductVariantId) {
      return NextResponse.json({ error: "Please choose a wearable option" }, { status: 400 });
    }
    if (!hasVariants && wearProductVariantId) {
      return NextResponse.json({ error: "This wearable has no options" }, { status: 400 });
    }
    const selectedVariant = wearProductVariantId
      ? wearProduct.variants.find((row) => row.id === wearProductVariantId) ?? null
      : null;
    if (wearProductVariantId && !selectedVariant) {
      return NextResponse.json({ error: "Selected wearable option is not available" }, { status: 400 });
    }

    const effectiveMarginBps = resolveStudioMarginBps(wearConfig.marginBps, globalPricing);
    const baseUnit = selectedVariant?.priceCents ?? wearProduct.priceCents;
    const unit = calculateWearPrice(baseUnit, effectiveMarginBps);
    const same = existingItems.find(
      (i) =>
        i.itemType === "wear" &&
        i.wearProductId === wearProductId &&
        (i.wearProductVariantId ?? null) === (selectedVariant?.id ?? null) &&
        i.vendorId === studioId,
    );
    const nextQuantity = (same?.quantity ?? 0) + quantity;
    if (selectedVariant?.stockQuantity != null && selectedVariant.stockQuantity < nextQuantity) {
      return NextResponse.json(
        {
          error: `Not enough stock for "${selectedVariant.label}" (available: ${Math.max(0, selectedVariant.stockQuantity)})`,
        },
        { status: 400 },
      );
    }

    if (same) {
      await prisma.cartItem.update({
        where: { id: same.id },
        data: { quantity: same.quantity + quantity, priceSnapshotCents: unit, vendorId: studioId },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId,
          itemType: "wear",
          wearProductId,
          wearProductVariantId: selectedVariant?.id ?? null,
          vendorId: studioId,
          quantity,
          priceSnapshotCents: unit,
        },
      });
    }
  } else if (productId) {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: "active",
        studio: { status: "approved" },
      },
      include: {
        variants: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });
    if (!product) return NextResponse.json({ error: "Product not available" }, { status: 400 });
    if (product.pricingType === "recurring") {
      return NextResponse.json({ error: "This offering is subscription-based. Use subscription checkout." }, { status: 409 });
    }
    const hasVariants = product.variants.length > 0;
    if (hasVariants && !variantId) {
      return NextResponse.json({ error: "Please choose a product variant" }, { status: 400 });
    }
    if (!hasVariants && variantId) {
      return NextResponse.json({ error: "This product has no variants" }, { status: 400 });
    }
    const variant = variantId ? product.variants.find((row) => row.id === variantId) ?? null : null;
    if (variantId && !variant) {
      return NextResponse.json({ error: "Selected variant is not available" }, { status: 400 });
    }

    const unit = variant?.priceCents ?? product.salePriceCents ?? product.priceCents;
    const same = existingItems.find(
      (i) =>
        i.itemType === "product" &&
        i.productId === productId &&
        (i.variantId ?? null) === (variant?.id ?? null),
    );
    const nextQuantity = (same?.quantity ?? 0) + quantity;
    if (variant) {
      if (variant.stockQuantity != null && variant.stockQuantity < nextQuantity) {
        return NextResponse.json(
          {
            error: `Not enough stock for variant "${variant.name}" (available: ${Math.max(0, variant.stockQuantity)})`,
          },
          { status: 400 },
        );
      }
    } else {
      if (product.stockStatus === "out_of_stock" || product.stockQuantity < nextQuantity) {
        return NextResponse.json(
          {
            error: `Not enough stock for "${product.title}" (available: ${Math.max(0, product.stockQuantity)})`,
          },
          { status: 400 },
        );
      }
    }
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
          variantId: variant?.id ?? null,
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
    let validatedInstructorId: string | null | undefined = instructorId;
    if (instructorId) {
      const instructorLink = await prisma.instructorExperienceLink.findFirst({
        where: {
          instructorId,
          experienceId: experience.id,
          instructor: {
            studioId: experience.studioId,
            isActive: true,
          },
        },
        select: { instructorId: true },
      });
      if (!instructorLink) {
        return NextResponse.json({ error: "Selected instructor is not available for this class" }, { status: 400 });
      }
      validatedInstructorId = instructorLink.instructorId;
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
          ...(validatedInstructorId !== undefined ? { instructorId: validatedInstructorId } : {}),
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
          instructorId: validatedInstructorId ?? null,
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
    instructorId?: string | null;
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
      product: { include: { variants: true } },
      variant: true,
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
  const instructorIdPatch =
    body.instructorId === null
      ? null
      : typeof body.instructorId === "string"
        ? body.instructorId.trim() || null
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
      let validatedInstructorPatch: string | null | undefined = instructorIdPatch;
      if (instructorIdPatch) {
        const instructorLink = await prisma.instructorExperienceLink.findFirst({
          where: {
            instructorId: instructorIdPatch,
            experienceId: slot.experience.id,
            instructor: {
              studioId: slot.experience.studioId,
              isActive: true,
            },
          },
          select: { instructorId: true },
        });
        if (!instructorLink) {
          return NextResponse.json({ error: "Selected instructor is not available for this class" }, { status: 400 });
        }
        validatedInstructorPatch = instructorLink.instructorId;
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
          ...(validatedInstructorPatch !== undefined ? { instructorId: validatedInstructorPatch } : {}),
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
    if (item.itemType === "product" && item.product) {
      if (item.variantId) {
        const variant =
          item.variant ?? item.product.variants.find((row) => row.id === item.variantId) ?? null;
        if (!variant) {
          return NextResponse.json({ error: "Selected product variant no longer exists" }, { status: 409 });
        }
        if (variant.stockQuantity != null && variant.stockQuantity < quantity) {
          return NextResponse.json(
            {
              error: `Not enough stock for variant "${variant.name}" (available: ${Math.max(0, variant.stockQuantity)})`,
            },
            { status: 400 },
          );
        }
      } else if (item.product.stockStatus === "out_of_stock" || item.product.stockQuantity < quantity) {
        return NextResponse.json(
          { error: `Not enough stock for "${item.product.title}" (available: ${Math.max(0, item.product.stockQuantity)})` },
          { status: 400 },
        );
      }
    }
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