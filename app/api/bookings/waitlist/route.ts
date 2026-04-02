import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { validateSeatTypeRequired } from "@/lib/bookings/seat-type";

/**
 * Join waitlist when the slot has no remaining seats. Does not reserve capacity.
 */
export async function POST(req: Request) {
  let body: {
    slotId?: string;
    participantCount?: number;
    customerName?: string;
    customerEmail?: string;
    seatType?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slotId = typeof body.slotId === "string" ? body.slotId : "";
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";
  const participantCount =
    typeof body.participantCount === "number" && body.participantCount > 0
      ? Math.floor(body.participantCount)
      : 0;

  if (!slotId || !customerName || !customerEmail || participantCount < 1) {
    return NextResponse.json(
      { error: "slotId, participantCount, customerName, customerEmail required" },
      { status: 400 }
    );
  }

  const user = await getSessionUser();

  const slot = await prisma.bookingSlot.findUnique({
    where: { id: slotId },
    include: { experience: { include: { studio: true } } },
  });
  if (!slot?.experience) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  const { experience } = slot;
  if (!experience.waitlistEnabled) {
    return NextResponse.json({ error: "Waitlist is not enabled for this class" }, { status: 400 });
  }
  if (experience.status !== "active" || experience.visibility !== "public" || experience.studio.status !== "approved") {
    return NextResponse.json({ error: "Experience not available" }, { status: 400 });
  }
  if (participantCount < experience.minimumParticipants || participantCount > experience.maximumParticipants) {
    return NextResponse.json({ error: "Invalid participant count" }, { status: 400 });
  }

  const remaining = slot.capacityTotal - slot.capacityReserved;
  const canBookThisParty = slot.status === "open" && remaining >= participantCount;
  if (canBookThisParty) {
    return NextResponse.json(
      { error: "Seats are still available — book normally instead of joining the waitlist" },
      { status: 400 }
    );
  }

  const seatType = typeof body.seatType === "string" && body.seatType.trim() ? body.seatType.trim() : null;
  const stErr = validateSeatTypeRequired(slot.seatCapacities, seatType);
  if (stErr) return NextResponse.json({ error: stErr }, { status: 400 });

  const existing = await prisma.bookingWaitlistEntry.findFirst({
    where: {
      slotId,
      customerEmail,
      status: "active",
    },
  });
  if (existing) {
    const updated = await prisma.bookingWaitlistEntry.update({
      where: { id: existing.id },
      data: {
        participantCount,
        seatType,
        customerName,
        ...(user?.id ? { customerUserId: user.id } : {}),
      },
    });
    return NextResponse.json({
      entry: updated,
      message: "Added to waitlist",
    });
  }

  const entry = await prisma.bookingWaitlistEntry.create({
    data: {
      studioId: experience.studioId,
      experienceId: experience.id,
      slotId: slot.id,
      customerUserId: user?.id ?? null,
      customerName,
      customerEmail,
      participantCount,
      seatType,
      status: "active",
    },
  });

  return NextResponse.json({ entry, message: "Added to waitlist" });
}
