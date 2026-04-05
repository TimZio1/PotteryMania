import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { resolveCommissionBps, commissionCentsFromLine } from "@/lib/commission";
import { getStripe } from "@/lib/stripe";
import { depositChargedCents } from "@/lib/bookings/deposit";
import { allocateTicketRef } from "@/lib/bookings/ticket-ref";
import { seatTypeCapacityError, validateSeatTypeRequired } from "@/lib/bookings/seat-type";
import { assertRateLimit } from "@/lib/rate-limit";
import { isRuntimeFlagEnabled, RUNTIME_FLAG_KEYS } from "@/lib/runtime-feature-flags";
import type { CancellationPolicy } from "@prisma/client";

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
    seatType?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slotId = typeof body.slotId === "string" ? body.slotId : "";
  const participantCount =
    typeof body.participantCount === "number" ? Math.floor(body.participantCount) : 0;
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";
  const seatType = typeof body.seatType === "string" && body.seatType.trim() ? body.seatType.trim() : null;

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
  if (!studio.activationPaidAt) {
    return NextResponse.json({ error: "Studio has not been activated" }, { status: 400 });
  }
  if (slot.status !== "open") {
    return NextResponse.json({ error: "Slot not bookable" }, { status: 400 });
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

  const stripeRow = await prisma.stripeAccount.findUnique({ where: { studioId: studio.id } });
  if (!stripeRow?.chargesEnabled || !stripeRow.payoutsEnabled) {
    return NextResponse.json({ error: "Studio has not completed Stripe Connect" }, { status: 400 });
  }

  const fullLine = experience.priceCents * participantCount;
  const charged = depositChargedCents(fullLine, experience.bookingDepositBps);
  const bps = await resolveCommissionBps(studio.id, "booking");
  const commissionTotal = commissionCentsFromLine(charged, bps);
  const vendorCents = charged - commissionTotal;

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
      },
    });

    const order = await tx.order.create({
      data: {
        customerUserId: user?.id ?? null,
        customerName,
        customerEmail,
        customerPhone: body.customerPhone?.trim() || null,
        notes: body.notes?.trim() || null,
        orderStatus: "pending",
        paymentStatus: "pending",
        subtotalCents: charged,
        totalCents: charged,
        currency: "EUR",
        items: {
          create: {
            itemType: "booking",
            bookingId: booking.id,
            vendorId: studio.id,
            quantity: 1,
            participantCount,
            priceSnapshotCents: charged,
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
  const stripeName = isDeposit
    ? `${experience.title} — deposit (${participantCount} pax)`
    : `${experience.title} (per person)`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: [
      {
        quantity: isDeposit ? 1 : participantCount,
        price_data: {
          currency: "eur",
          unit_amount: isDeposit ? charged : experience.priceCents,
          product_data: { name: stripeName },
        },
      },
    ],
    success_url: `${baseUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl()}/classes/${experience.id}?cancelled=1`,
    payment_intent_data: {
      application_fee_amount: commissionTotal,
      transfer_data: { destination: stripeRow.stripeAccountId },
      metadata: { orderId: order.id },
    },
    metadata: { orderId: order.id },
  });

  return NextResponse.json({ url: session.url, orderId: order.id, bookingId: booking.id });
}
