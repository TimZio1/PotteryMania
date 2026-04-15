import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { resolveCommissionBps, commissionCentsFromLine } from "@/lib/commission";
import { getStripe } from "@/lib/stripe";
import { bookingChargeNowCents, normalizeBookingPaymentPreference } from "@/lib/bookings/deposit";
import { allocateTicketRef } from "@/lib/bookings/ticket-ref";
import { seatTypeCapacityError, validateSeatTypeRequired } from "@/lib/bookings/seat-type";
import { addOnSelectionSummary, validateAndSnapshotAddOnSelections } from "@/lib/bookings/add-ons";
import { validateIntakeResponses } from "@/lib/intake-forms/validate-responses";
import { assertRateLimit } from "@/lib/rate-limit";
import { isRuntimeFlagEnabled, RUNTIME_FLAG_KEYS } from "@/lib/runtime-feature-flags";
import type { CancellationPolicy } from "@prisma/client";
import { logApiError } from "@/lib/monitoring";
import { studioCanOperateMessage } from "@/lib/studio-operating-gates";

function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function policySnapshot(pol: CancellationPolicy | null) {
  if (!pol) return null;
  return {
    id: pol.id,
    name: pol.name,
    policyType: pol.policyType,
    hoursBeforeStart: pol.hoursBeforeStart,
    refundPercentage: pol.refundPercentage,
    customPolicyText: pol.customPolicyText,
  };
}

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "booking-checkout", 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many booking attempts" }, { status: 429 });
  }
  if (!(await isRuntimeFlagEnabled(RUNTIME_FLAG_KEYS.bookingCheckoutEnabled))) {
    return NextResponse.json(
      { error: "Class booking checkout is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
  const user = await getSessionUser();

  let body: {
    slotId?: string;
    participantCount?: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    notes?: string;
    bookingPaymentPreference?: "deposit" | "full";
    instructorId?: string | null;
    seatType?: string | null;
    addOnSelections?: unknown;
    intakeResponses?: unknown;
    tipAmountCents?: number;
    acceptTerms?: boolean;
  };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("bookings_checkout_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slotId = typeof body.slotId === "string" ? body.slotId : "";
  const participantCount =
    typeof body.participantCount === "number" ? Math.floor(body.participantCount) : 0;
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";
  const seatType = typeof body.seatType === "string" && body.seatType.trim() ? body.seatType.trim() : null;
  const instructorId =
    body.instructorId === null
      ? null
      : typeof body.instructorId === "string"
        ? body.instructorId.trim() || null
        : null;
  const tipAmountCents =
    typeof body.tipAmountCents === "number" && Number.isFinite(body.tipAmountCents)
      ? Math.max(0, Math.floor(body.tipAmountCents))
      : 0;

  if (!slotId || participantCount < 1 || !customerName || !customerEmail) {
    return NextResponse.json(
      { error: "slotId, participantCount, customerName, customerEmail required" },
      { status: 400 }
    );
  }

  const slot = await prisma.bookingSlot.findUnique({
    where: { id: slotId },
    include: {
      experience: { include: { studio: true, cancellationPolicy: true } },
    },
  });

  if (!slot?.experience) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const { experience } = slot;
  const studio = experience.studio;

  if (experience.status !== "active" || experience.visibility !== "public") {
    return NextResponse.json({ error: "Experience not available" }, { status: 400 });
  }
  if (studio.status !== "approved") {
    return NextResponse.json({ error: "Studio not available" }, { status: 400 });
  }
  if (slot.status !== "open") {
    return NextResponse.json({ error: "Slot not bookable" }, { status: 400 });
  }
  if (body.acceptTerms !== true) {
    return NextResponse.json({ error: "You must accept terms and cancellation policy before checkout" }, { status: 400 });
  }
  const maxAdvanceBookingDays = experience.maxAdvanceBookingDays ?? 0;
  if (maxAdvanceBookingDays > 0) {
    const advanceLimitDate = new Date();
    advanceLimitDate.setDate(advanceLimitDate.getDate() + maxAdvanceBookingDays);
    if (slot.slotDate > advanceLimitDate) {
      return NextResponse.json(
        { error: `Bookings open up to ${maxAdvanceBookingDays} days ahead` },
        { status: 400 },
      );
    }
  }
  const cutoffMs = (experience.bookingCutoffHours ?? 0) * 3600_000;
  if (cutoffMs > 0) {
    const dateStr = slot.slotDate.toISOString().slice(0, 10);
    const slotStartMs = new Date(`${dateStr}T${slot.startTime}:00`).getTime();
    if (slotStartMs - Date.now() < cutoffMs) {
      return NextResponse.json(
        { error: `Bookings close ${experience.bookingCutoffHours}h before the session` },
        { status: 400 },
      );
    }
  }

  if (participantCount < experience.minimumParticipants || participantCount > experience.maximumParticipants) {
    return NextResponse.json({ error: "Invalid participant count for this experience" }, { status: 400 });
  }

  const stErr = validateSeatTypeRequired(slot.seatCapacities, seatType);
  if (stErr) return NextResponse.json({ error: stErr }, { status: 400 });
  const seatErr = seatTypeCapacityError(slot.seatCapacities, seatType, participantCount, 0);
  if (seatErr) return NextResponse.json({ error: seatErr }, { status: 400 });

  const remaining = slot.capacityTotal - slot.capacityReserved;
  if (participantCount > remaining) {
    return NextResponse.json({ error: "Not enough capacity" }, { status: 400 });
  }
  const maxActiveBookingsPerCustomer = experience.maxActiveBookingsPerCustomer ?? 0;
  if (user?.id && maxActiveBookingsPerCustomer > 0) {
    const activeBookings = await prisma.booking.count({
      where: {
        experienceId: experience.id,
        customerUserId: user.id,
        bookingStatus: { in: ["pending", "confirmed"] },
      },
    });
    if (activeBookings >= maxActiveBookingsPerCustomer) {
      return NextResponse.json(
        { error: `You can hold up to ${maxActiveBookingsPerCustomer} active bookings for this class` },
        { status: 400 },
      );
    }
  }

  const stripeRow = await prisma.stripeAccount.findUnique({ where: { studioId: studio.id } });
  if (!stripeRow?.chargesEnabled || !stripeRow.payoutsEnabled) {
    return NextResponse.json({ error: studioCanOperateMessage() }, { status: 400 });
  }

  const addOnValidation = await validateAndSnapshotAddOnSelections(prisma, experience.id, body.addOnSelections);
  if (!addOnValidation.ok) {
    return NextResponse.json(
      { error: addOnValidation.error, ...(addOnValidation.priceChanged ? { priceChanged: true } : {}) },
      { status: addOnValidation.priceChanged ? 409 : 400 },
    );
  }

  const intakeValidation = await validateIntakeResponses(prisma, experience.id, body.intakeResponses);
  if (!intakeValidation.ok) {
    return NextResponse.json({ error: intakeValidation.error }, { status: 400 });
  }

  const fullLine = experience.priceCents * participantCount + addOnValidation.totalCents;
  let validatedInstructorId: string | null = null;
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
  const bookingPaymentPreference = normalizeBookingPaymentPreference(body.bookingPaymentPreference, {
    bookingDepositBps: experience.bookingDepositBps,
    allowFullPaymentOption: experience.allowFullPaymentOption,
  });
  const charged = bookingChargeNowCents(
    fullLine,
    {
      bookingDepositBps: experience.bookingDepositBps,
      allowFullPaymentOption: experience.allowFullPaymentOption,
    },
    bookingPaymentPreference,
  );
  const bps = await resolveCommissionBps(studio.id, "booking");
  const commissionTotal = commissionCentsFromLine(charged, bps);
  const effectiveTipCents = studio.tipsEnabled ? tipAmountCents : 0;
  const chargedNow = charged + effectiveTipCents;
  const vendorCents = charged - commissionTotal + effectiveTipCents;

  const snap = policySnapshot(experience.cancellationPolicy);

  const { booking, order } = await prisma.$transaction(async (tx) => {
    const ticketRef = await allocateTicketRef(tx);
    const booking = await tx.booking.create({
      data: {
        studioId: studio.id,
        experienceId: experience.id,
        slotId: slot.id,
        customerUserId: user?.id ?? null,
        customerName,
        customerEmail,
        customerPhone: body.customerPhone?.trim() || null,
        participantCount,
        seatType,
        instructorId: validatedInstructorId,
        ticketRef,
        bookingStatus: "pending",
        paymentStatus: "pending",
        totalAmountCents: fullLine,
        depositAmountCents: charged,
        remainingBalanceCents: fullLine - charged,
        commissionAmountCents: commissionTotal,
        vendorAmountCents: vendorCents,
        cancellationPolicySnapshot: snap === null ? undefined : snap,
        notes: body.notes?.trim() || null,
        tipAmountCents: effectiveTipCents,
        termsAcceptedAt: new Date(),
      },
    });

    if (addOnValidation.selections.length > 0) {
      await tx.bookingAddOn.createMany({
        data: addOnValidation.selections.map((selection) => ({
          bookingId: booking.id,
          addOnId: selection.addOnId,
          addOnName: selection.name,
          quantity: selection.quantity,
          unitPriceCents: selection.unitPriceCents,
          durationMinutesExtra: selection.durationMinutesExtra,
        })),
      });
    }

    if (intakeValidation.responses.length > 0) {
      await tx.intakeFormResponse.createMany({
        data: intakeValidation.responses.map((response) => ({
          bookingId: booking.id,
          formId: response.formId,
          labelSnapshot: response.label,
          fieldTypeSnapshot: response.fieldType,
          includeInInvoiceSnapshot: response.includeInInvoice,
          value: response.value,
        })),
      });
    }

    const order = await tx.order.create({
      data: {
        customerUserId: user?.id ?? null,
        customerName,
        customerEmail,
        customerPhone: body.customerPhone?.trim() || null,
        notes: body.notes?.trim() || null,
        orderStatus: "pending",
        paymentStatus: "pending",
        subtotalCents: chargedNow,
        totalCents: chargedNow,
        currency: "EUR",
        items: {
          create: {
            itemType: "booking",
            bookingId: booking.id,
            vendorId: studio.id,
            quantity: 1,
            participantCount,
            priceSnapshotCents: chargedNow,
            commissionSnapshotCents: commissionTotal,
            vendorAmountSnapshotCents: vendorCents,
          },
        },
      },
    });

    return { booking, order };
  });

  const stripe = getStripe();
  const isDeposit = charged < fullLine;
  const addOnSuffix = addOnValidation.selections.length
    ? ` + ${addOnSelectionSummary(addOnValidation.selections).join(", ")}`
    : "";
  const stripeName = isDeposit
    ? `${experience.title}${addOnSuffix} — deposit (${participantCount} pax)`
    : `${experience.title}${addOnSuffix}`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: charged,
            product_data: { name: stripeName },
          },
        },
        ...(effectiveTipCents > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "eur",
                  unit_amount: effectiveTipCents,
                  product_data: { name: "Tip" },
                },
              },
            ]
          : []),
      ],
      success_url: `${baseUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl()}/classes/${experience.id}?cancelled=1`,
      payment_intent_data: {
        ...(commissionTotal > 0 ? { application_fee_amount: commissionTotal } : {}),
        metadata: { orderId: order.id, bookingPaymentPreference },
      },
      metadata: { orderId: order.id, bookingPaymentPreference },
    },
    { stripeAccount: stripeRow.stripeAccountId },
  );

  return NextResponse.json({ url: session.url, orderId: order.id, bookingId: booking.id });
}
