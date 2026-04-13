import type { Prisma } from "@prisma/client";
import { commissionCentsFromLine, resolveCommissionBps } from "@/lib/commission";

export async function settleBookingRemainderPayment(
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    provider: "stripe" | "manual";
    providerPaymentId?: string | null;
    stripeCheckoutSessionId?: string | null;
    paidAt?: Date;
  },
) {
  const paidAt = input.paidAt ?? new Date();
  const booking = await tx.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      studio: { select: { id: true } },
      orderItems: {
        select: {
          id: true,
          orderId: true,
          vendorId: true,
        },
      },
    },
  });
  if (!booking) {
    return { ok: false as const, error: "Booking not found" };
  }
  if (booking.remainingBalanceCents <= 0) {
    return { ok: true as const, skip: true };
  }

  const remainderCents = booking.remainingBalanceCents;
  const bookingBps = await resolveCommissionBps(booking.studioId, "booking");
  const remainderCommissionCents = commissionCentsFromLine(remainderCents, bookingBps);
  const remainderVendorCents = remainderCents - remainderCommissionCents;
  const orderItem = booking.orderItems[0] ?? null;

  await tx.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: "paid",
      remainingBalanceCents: 0,
      remainderPaidAt: paidAt,
      commissionAmountCents: booking.commissionAmountCents + remainderCommissionCents,
      vendorAmountCents: booking.vendorAmountCents + remainderVendorCents,
      ...(input.provider === "stripe" ? { remainderPaymentLink: null } : {}),
    },
  });

  await tx.bookingAuditLog.create({
    data: {
      bookingId: booking.id,
      actionType: input.provider === "stripe" ? "remainder_paid_online" : "remainder_marked_paid",
      actorRole: input.provider === "stripe" ? "system" : "vendor",
      payload: {
        provider: input.provider,
        remainderCents,
        providerPaymentId: input.providerPaymentId ?? null,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
      } as Prisma.InputJsonValue,
    },
  });

  if (orderItem) {
    const remainderOrder = await tx.order.create({
      data: {
        customerUserId: booking.customerUserId,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        notes: `Remainder payment for booking ${booking.ticketRef ?? booking.id}`,
        orderStatus: "paid",
        paymentStatus: "paid",
        fulfillmentStatus: "processing",
        subtotalCents: remainderCents,
        totalCents: remainderCents,
        currency: "EUR",
        stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
        items: {
          create: {
            itemType: "booking",
            bookingId: booking.id,
            vendorId: orderItem.vendorId,
            quantity: 1,
            participantCount: booking.participantCount,
            priceSnapshotCents: remainderCents,
            commissionSnapshotCents: remainderCommissionCents,
            vendorAmountSnapshotCents: remainderVendorCents,
          },
        },
      },
    });

    await tx.payment.create({
      data: {
        orderId: remainderOrder.id,
        provider: input.provider,
        providerPaymentId: input.providerPaymentId ?? null,
        paymentStatus: "succeeded",
        amountCents: remainderCents,
        currency: "EUR",
      },
    });
  }

  return {
    ok: true as const,
    skip: false,
    remainderCents,
  };
}
