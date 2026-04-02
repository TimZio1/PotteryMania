import { prisma } from "@/lib/db";
import { isCancellable, cancelStatusForRole, isCancelled } from "./status";
import { safeReleaseCapacity } from "./slot-lock";
import type { Prisma } from "@prisma/client";

export type CancelResult =
  | { ok: true; bookingId: string; newStatus: string; refundOutcome: string; refundAmountCents: number }
  | { ok: false; error: string };

export async function cancelBooking(opts: {
  bookingId: string;
  role: "customer" | "vendor" | "admin";
  userId?: string | null;
  reason?: string;
}): Promise<CancelResult> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: opts.bookingId },
      include: { slot: true },
    });
    if (!booking) return { ok: false, error: "Booking not found" };
    if (isCancelled(booking.bookingStatus)) return { ok: false, error: "Already cancelled" };
    if (!isCancellable(booking.bookingStatus)) {
      return { ok: false, error: `Cannot cancel booking in status: ${booking.bookingStatus}` };
    }

    const newStatus = cancelStatusForRole(opts.role);

    let refundOutcome = "none";
    let refundAmountCents = 0;

    if (booking.paymentStatus === "paid") {
      const snap = booking.cancellationPolicySnapshot as Record<string, unknown> | null;
      if (snap) {
        const policyType = snap.policyType as string | undefined;
        const hoursBeforeStart = (snap.hoursBeforeStart as number) ?? 0;
        const refundPercentage = (snap.refundPercentage as number) ?? 100;

        const slotStart = new Date(booking.slot.slotDate);
        const [h, m] = (booking.slot.startTime || "00:00").split(":").map(Number);
        slotStart.setHours(h || 0, m || 0, 0, 0);
        const hoursUntil = (slotStart.getTime() - Date.now()) / (1000 * 60 * 60);

        if (policyType === "non_refundable") {
          refundOutcome = "non_refundable";
          refundAmountCents = 0;
        } else if (policyType === "refundable_until_hours") {
          if (hoursUntil >= hoursBeforeStart) {
            refundOutcome = "full_refund_eligible";
            refundAmountCents = booking.totalAmountCents;
          } else {
            refundOutcome = "past_deadline";
            refundAmountCents = 0;
          }
        } else if (policyType === "partial_refund_until_hours") {
          if (hoursUntil >= hoursBeforeStart) {
            refundOutcome = "partial_refund_eligible";
            refundAmountCents = Math.floor((booking.totalAmountCents * refundPercentage) / 100);
          } else {
            refundOutcome = "past_deadline";
            refundAmountCents = 0;
          }
        } else {
          refundOutcome = "custom_review_needed";
          refundAmountCents = 0;
        }
      } else {
        refundOutcome = "no_policy_full_refund";
        refundAmountCents = booking.totalAmountCents;
      }

      if (opts.role === "vendor" || opts.role === "admin") {
        refundOutcome = `${opts.role}_initiated_full_refund`;
        refundAmountCents = booking.totalAmountCents;
      }
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: { bookingStatus: newStatus },
    });

    await tx.bookingCancellation.create({
      data: {
        bookingId: booking.id,
        cancelledByRole: opts.role,
        cancelledByUserId: opts.userId ?? null,
        cancellationReason: opts.reason ?? null,
        refundOutcome,
        refundAmountCents,
      },
    });

    await tx.bookingAuditLog.create({
      data: {
        bookingId: booking.id,
        actionType: "cancelled",
        actorRole: opts.role,
        actorUserId: opts.userId ?? null,
        payload: { reason: opts.reason, refundOutcome, refundAmountCents } as Prisma.InputJsonValue,
      },
    });

    if (booking.bookingStatus === "confirmed") {
      await safeReleaseCapacity(tx, booking.slotId, booking.participantCount, booking.seatType);
    }

    return { ok: true, bookingId: booking.id, newStatus, refundOutcome, refundAmountCents };
  });
}