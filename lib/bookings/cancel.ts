import { prisma } from "@/lib/db";
import { isCancellable, cancelStatusForRole, isCancelled } from "./status";
import { safeReleaseCapacity } from "./slot-lock";
import { refundEligibilityFromPolicySnapshot } from "./cancellation-policy";
import { notifyWaitlistOnCapacityRelease } from "./waitlist-notify";
import type { Booking, Prisma } from "@prisma/client";

function amountCollectedCents(booking: Pick<Booking, "paymentStatus" | "totalAmountCents" | "depositAmountCents">): number {
  if (booking.paymentStatus === "paid") return booking.totalAmountCents;
  if (booking.paymentStatus === "partial") return booking.depositAmountCents;
  return 0;
}

export type CancelResult =
  | { ok: true; bookingId: string; newStatus: string; refundOutcome: string; refundAmountCents: number; slotId: string }
  | { ok: false; error: string };

export async function cancelBooking(opts: {
  bookingId: string;
  role: "customer" | "vendor" | "admin";
  userId?: string | null;
  reason?: string;
}): Promise<CancelResult> {
  const result: CancelResult = await prisma.$transaction(async (tx): Promise<CancelResult> => {
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
    const paid = amountCollectedCents(booking);

    if (paid > 0) {
      const snap = booking.cancellationPolicySnapshot as Record<string, unknown> | null;
      if (opts.role === "customer") {
        const { refundOutcome: ro, refundAmountCents: ra } = refundEligibilityFromPolicySnapshot(snap, {
          slotDate: booking.slot.slotDate,
          startTime: booking.slot.startTime || "00:00",
          totalAmountCents: booking.totalAmountCents,
          paidCents: paid,
        });
        refundOutcome = ro;
        refundAmountCents = ra;
      } else {
        refundOutcome = `${opts.role}_initiated_refund`;
        refundAmountCents = paid;
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

    const packageUsage = await tx.classPackageUsage.findFirst({
      where: { bookingId: booking.id, refunded: false },
      include: {
        purchase: {
          include: {
            package: { select: { autoRefundOnCancel: true } },
          },
        },
      },
    });
    if (packageUsage?.purchase.package.autoRefundOnCancel) {
      const decrementedUsed = Math.max(0, packageUsage.purchase.creditsUsed - packageUsage.creditsUsed);
      await tx.classPackageUsage.update({
        where: { id: packageUsage.id },
        data: { refunded: true },
      });
      await tx.classPackagePurchase.update({
        where: { id: packageUsage.purchaseId },
        data: {
          creditsUsed: { decrement: packageUsage.creditsUsed },
          status: decrementedUsed < packageUsage.purchase.creditsTotal ? "active" : packageUsage.purchase.status,
        },
      });
    }

    if (booking.bookingStatus === "confirmed" || booking.bookingStatus === "awaiting_vendor_approval") {
      await safeReleaseCapacity(tx, booking.slotId, booking.participantCount, booking.seatType);
    }

    return { ok: true, bookingId: booking.id, newStatus, refundOutcome, refundAmountCents, slotId: booking.slotId };
  });

  if (result.ok) {
    notifyWaitlistOnCapacityRelease(result.slotId).catch(() => {});
  }

  return result;
}