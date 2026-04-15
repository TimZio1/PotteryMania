import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { safeReserveCapacity } from "@/lib/bookings/slot-lock";
import { allocateTicketRef } from "@/lib/bookings/ticket-ref";
import { seatTypeCapacityError, validateSeatTypeRequired } from "@/lib/bookings/seat-type";
import { validateAndSnapshotAddOnSelections } from "@/lib/bookings/add-ons";
import { validateIntakeResponses } from "@/lib/intake-forms/validate-responses";
import { assertRateLimit } from "@/lib/rate-limit";
import { logApiError } from "@/lib/monitoring";

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "pay-at-studio", 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Login required for pay-at-studio bookings" }, { status: 401 });
  }

  let body: {
    slotId?: string;
    participantCount?: number;
    seatType?: string;
    customerName?: string;
    customerEmail?: string;
    instructorId?: string | null;
    notes?: string;
    paymentMethod?: string;
    addOnSelections?: unknown;
    intakeResponses?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";
  const participantCount = typeof body.participantCount === "number" ? body.participantCount : 0;
  const seatType = typeof body.seatType === "string" ? body.seatType.trim() || null : null;
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  const instructorId =
    body.instructorId === null
      ? null
      : typeof body.instructorId === "string"
        ? body.instructorId.trim() || null
        : null;

  if (!slotId || participantCount < 1 || !customerName || !customerEmail) {
    return NextResponse.json(
      { error: "slotId, participantCount, customerName, and customerEmail are required" },
      { status: 400 },
    );
  }

  const slot = await prisma.bookingSlot.findUnique({
    where: { id: slotId },
    include: {
      experience: {
        include: { studio: { select: { id: true, status: true } }, cancellationPolicy: true },
      },
    },
  });

  if (!slot || !slot.experience) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  if (!slot.experience.allowPayAtStudio) {
    return NextResponse.json({ error: "Pay at studio is not enabled for this class" }, { status: 403 });
  }

  if (slot.experience.studio.status !== "approved") {
    return NextResponse.json({ error: "Studio not available" }, { status: 400 });
  }

  if (participantCount < slot.experience.minimumParticipants || participantCount > slot.experience.maximumParticipants) {
    return NextResponse.json(
      { error: `Party size must be ${slot.experience.minimumParticipants}–${slot.experience.maximumParticipants}` },
      { status: 400 },
    );
  }

  const cutoffMs = (slot.experience.bookingCutoffHours ?? 0) * 3600_000;
  if (cutoffMs > 0) {
    const dateStr = slot.slotDate.toISOString().slice(0, 10);
    const slotStartMs = new Date(`${dateStr}T${slot.startTime}:00`).getTime();
    if (slotStartMs - Date.now() < cutoffMs) {
      return NextResponse.json(
        { error: `Bookings close ${slot.experience.bookingCutoffHours}h before the session` },
        { status: 400 },
      );
    }
  }

  const stErr = validateSeatTypeRequired(slot.seatCapacities, seatType);
  if (stErr) return NextResponse.json({ error: stErr }, { status: 400 });
  const seatErr = seatTypeCapacityError(slot.seatCapacities, seatType, participantCount, 0);
  if (seatErr) return NextResponse.json({ error: seatErr }, { status: 400 });

  const addOnValidation = await validateAndSnapshotAddOnSelections(prisma, slot.experience.id, body.addOnSelections);
  if (!addOnValidation.ok) {
    return NextResponse.json(
      { error: addOnValidation.error, ...(addOnValidation.priceChanged ? { priceChanged: true } : {}) },
      { status: addOnValidation.priceChanged ? 409 : 400 },
    );
  }

  const intakeValidation = await validateIntakeResponses(prisma, slot.experience.id, body.intakeResponses);
  if (!intakeValidation.ok) {
    return NextResponse.json({ error: intakeValidation.error }, { status: 400 });
  }
  let validatedInstructorId: string | null = null;
  if (instructorId) {
    const instructorLink = await prisma.instructorExperienceLink.findFirst({
      where: {
        instructorId,
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
    validatedInstructorId = instructorLink.instructorId;
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      await safeReserveCapacity(tx, slotId, participantCount, seatType);

      const ticketRef = await allocateTicketRef(tx);
      const totalCents = slot.experience.priceCents * participantCount + addOnValidation.totalCents;
      const snap = slot.experience.cancellationPolicy
        ? {
            id: slot.experience.cancellationPolicy.id,
            name: slot.experience.cancellationPolicy.name,
            policyType: slot.experience.cancellationPolicy.policyType,
            hoursBeforeStart: slot.experience.cancellationPolicy.hoursBeforeStart,
            refundPercentage: slot.experience.cancellationPolicy.refundPercentage,
            customPolicyText: slot.experience.cancellationPolicy.customPolicyText,
          }
        : undefined;

      const booking = await tx.booking.create({
        data: {
          studioId: slot.experience.studio.id,
          experienceId: slot.experience.id,
          slotId,
          customerUserId: user.id,
          customerName,
          customerEmail,
          participantCount,
          seatType,
          instructorId: validatedInstructorId,
          ticketRef,
          bookingStatus: slot.experience.bookingApprovalRequired ? "awaiting_vendor_approval" : "confirmed",
          paymentStatus: "pay_at_studio",
          totalAmountCents: totalCents,
          depositAmountCents: 0,
          remainingBalanceCents: totalCents,
          commissionAmountCents: 0,
          vendorAmountCents: totalCents,
          cancellationPolicySnapshot: snap,
          notes: notes || null,
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

      return booking;
    });

    return NextResponse.json({
      bookingId: booking.id,
      ticketRef: booking.ticketRef,
      status: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Booking failed";
    if (msg.includes("Not enough capacity") || msg.includes("not open")) {
      return NextResponse.json({ error: "This session is fully booked" }, { status: 409 });
    }
    logApiError("pay_at_studio_booking", e, undefined, req);
    return NextResponse.json({ error: "Booking failed. Please try again." }, { status: 500 });
  }
}
