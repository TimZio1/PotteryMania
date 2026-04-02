import { prisma } from "@/lib/db";
import { isReschedulable } from "./status";
import { safeReleaseCapacity, safeReserveCapacity } from "./slot-lock";
import type { Prisma } from "@prisma/client";

export type RescheduleResult =
  | { ok: true; bookingId: string; oldSlotId: string; newSlotId: string }
  | { ok: false; error: string };

export async function rescheduleBooking(opts: {
  bookingId: string;
  newSlotId: string;
  role: "customer" | "vendor" | "admin";
  userId?: string | null;
  reason?: string;
}): Promise<RescheduleResult> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: opts.bookingId },
      include: { slot: true },
    });
    if (!booking) return { ok: false, error: "Booking not found" };
    if (!isReschedulable(booking.bookingStatus)) {
      return { ok: false, error: `Cannot reschedule booking in status: ${booking.bookingStatus}` };
    }
    if (booking.slotId === opts.newSlotId) {
      return { ok: false, error: "New slot is the same as current slot" };
    }

    const newSlotCheck = await tx.bookingSlot.findUnique({ where: { id: opts.newSlotId } });
    if (!newSlotCheck) return { ok: false, error: "New slot not found" };
    if (newSlotCheck.experienceId !== booking.experienceId) {
      return { ok: false, error: "New slot belongs to a different experience" };
    }

    const oldSlotId = booking.slotId;
    try {
      await safeReserveCapacity(tx, opts.newSlotId, booking.participantCount, booking.seatType);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reserve new slot";
      return { ok: false, error: msg };
    }
    await safeReleaseCapacity(tx, oldSlotId, booking.participantCount, booking.seatType);

    await tx.booking.update({
      where: { id: booking.id },
      data: { slotId: opts.newSlotId },
    });

    await tx.bookingReschedule.create({
      data: {
        bookingId: booking.id,
        originalSlotId: oldSlotId,
        newSlotId: opts.newSlotId,
        rescheduledByRole: opts.role,
        rescheduledByUserId: opts.userId ?? null,
        rescheduleReason: opts.reason ?? null,
      },
    });

    await tx.bookingAuditLog.create({
      data: {
        bookingId: booking.id,
        actionType: "rescheduled",
        actorRole: opts.role,
        actorUserId: opts.userId ?? null,
        payload: { oldSlotId, newSlotId: opts.newSlotId, reason: opts.reason } as Prisma.InputJsonValue,
      },
    });

    return { ok: true, bookingId: booking.id, oldSlotId, newSlotId: opts.newSlotId };
  });
}