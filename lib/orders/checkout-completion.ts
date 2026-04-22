import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { allocateTicketRef } from "@/lib/bookings/ticket-ref";
import { safeReserveCapacity } from "@/lib/bookings/slot-lock";
import { couponHasRedemptionCapacity, lockCouponRow } from "@/lib/coupon-redemption-lock";
import {
  bookingConfirmationCopy,
  bookingPendingStudioConfirmationCopy,
  sendBookingEmails,
} from "@/lib/email/booking-notify";
import { orderConfirmationCopy, sendOrderEmails } from "@/lib/email/order-notify";
import { finalizeGiftCardRedemptionsForOrder } from "@/lib/gift-cards/checkout";
import { logApiError } from "@/lib/monitoring";
import { enrichCustomerEmailWithCalendar } from "@/lib/calendar/booking-email-calendar";
import { removeGoogleCalendarEventForBooking, syncBookingToGoogleCalendar } from "@/lib/calendar/google-sync";
import { consumePackageCreditForBooking } from "@/lib/packages/credits";
import { executeAdminStripeOrderRefund } from "@/lib/orders/admin-stripe-order-refund";
import { WEAR_EVENT_KINDS } from "@/lib/wear-event-kinds";

export type SettledCheckoutOrder = {
  skip: boolean;
  confirmedBookingIds: string[];
  pendingApprovalIds: string[];
  autoCancelledIds: string[];
  stockFailureCancelled: boolean;
};

type SideEffectRunner = (concern: string, fn: () => Promise<void>) => Promise<void>;

async function defaultSideEffectRunner(concern: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    logApiError("checkout_completion_side_effect", error, { concern });
  }
}

export async function settleCheckoutOrderPayment(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    currency: string;
    stripeAmountCents?: number;
    stripeTaxCents?: number;
    stripeTotalCents?: number;
    stripePaymentId?: string | null;
    stripeAccountId?: string | null;
    giftCardAmountCents?: number;
    stripeCheckoutSessionId?: string | null;
    couponRedemption?: { couponId: string; amountCents: number } | null;
    cartId?: string | null;
    checkoutCartItemIds?: string[] | null;
  },
): Promise<SettledCheckoutOrder> {
  const rows = await tx.$queryRawUnsafe<
    { id: string; order_status: string; payment_status: string; customer_user_id: string | null }[]
  >(
    `SELECT id, order_status::text, payment_status::text, customer_user_id
     FROM orders
     WHERE id = $1::uuid
     FOR UPDATE`,
    input.orderId,
  );
  if (
    !rows.length ||
    rows[0].order_status !== "pending" ||
    rows[0].payment_status !== "pending"
  ) {
    return {
      skip: true,
      confirmedBookingIds: [],
      pendingApprovalIds: [],
      autoCancelledIds: [],
      stockFailureCancelled: false,
    };
  }

  const pendingWearOrder = await tx.wearOrder.findFirst({
    where: { orderId: input.orderId, status: "pending" },
    include: { items: true },
  });

  await tx.order.update({
    where: { id: input.orderId },
    data: {
      orderStatus: "paid",
      paymentStatus: "paid",
      ...(typeof input.stripeTaxCents === "number" ? { taxCents: Math.max(0, input.stripeTaxCents) } : {}),
      ...(typeof input.stripeTotalCents === "number" ? { totalCents: Math.max(0, input.stripeTotalCents) } : {}),
      ...(input.stripeCheckoutSessionId ? { stripeCheckoutSessionId: input.stripeCheckoutSessionId } : {}),
    },
  });

  if ((input.stripeAmountCents ?? 0) > 0) {
    const existingStripePay = await tx.payment.findFirst({
      where: {
        orderId: input.orderId,
        provider: "stripe",
        ...(input.stripePaymentId ? { providerPaymentId: input.stripePaymentId } : {}),
      },
    });
    if (!existingStripePay) {
      await tx.payment.create({
        data: {
          orderId: input.orderId,
          provider: "stripe",
          providerPaymentId: input.stripePaymentId ?? null,
          providerAccountId: input.stripeAccountId ?? null,
          paymentStatus: "succeeded",
          amountCents: input.stripeAmountCents!,
          currency: input.currency,
        },
      });
    }
  }

  if ((input.giftCardAmountCents ?? 0) > 0) {
    const existingGiftPay = await tx.payment.findFirst({
      where: {
        orderId: input.orderId,
        provider: "gift_card",
      },
    });
    if (!existingGiftPay) {
      await tx.payment.create({
        data: {
          orderId: input.orderId,
          provider: "gift_card",
          paymentStatus: "succeeded",
          amountCents: input.giftCardAmountCents!,
          currency: input.currency,
        },
      });
    }
  }

  if ((input.stripeAmountCents ?? 0) <= 0 && (input.giftCardAmountCents ?? 0) <= 0) {
    await tx.payment.create({
      data: {
        orderId: input.orderId,
        provider: "manual",
        paymentStatus: "succeeded",
        amountCents: 0,
        currency: input.currency,
      },
    });
  }

  if (input.couponRedemption && input.couponRedemption.amountCents > 0) {
    const dup = await tx.discountRedemption.findFirst({ where: { orderId: input.orderId } });
    if (!dup) {
      await lockCouponRow(tx, input.couponRedemption.couponId);
      const coupon = await tx.coupon.findUnique({
        where: { id: input.couponRedemption.couponId },
        select: { id: true, maxPerCustomer: true },
      });
      const cap = await couponHasRedemptionCapacity(tx, input.couponRedemption.couponId);
      let withinUserLimit = true;
      if (coupon?.maxPerCustomer != null && rows[0].customer_user_id) {
        const perUserRedemptions = await tx.discountRedemption.count({
          where: {
            couponId: input.couponRedemption.couponId,
            userId: rows[0].customer_user_id,
          },
        });
        withinUserLimit = perUserRedemptions < coupon.maxPerCustomer;
      }
      if (cap && withinUserLimit) {
        await tx.discountRedemption.create({
          data: {
            couponId: input.couponRedemption.couponId,
            orderId: input.orderId,
            userId: rows[0].customer_user_id,
            amountCents: input.couponRedemption.amountCents,
          },
        });
        await tx.coupon.update({
          where: { id: input.couponRedemption.couponId },
          data: { redeemedCount: { increment: 1 } },
        });
      }
    }
  }

  await finalizeGiftCardRedemptionsForOrder(tx, {
    orderId: input.orderId,
    stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
  });

  const items = await tx.orderItem.findMany({ where: { orderId: input.orderId } });
  const confirmedBookingIds: string[] = [];
  const pendingApprovalIds: string[] = [];
  const autoCancelledIds: string[] = [];
  let stockFailureCancelled = false;
  const paidAt = new Date();

  const productItems = items.filter((it) => it.itemType === "product" && !!it.productId);
  const bookingItems = items.filter((it) => it.itemType === "booking" && !!it.bookingId);

  for (const it of productItems) {
    if (it.variantId) {
      const variant = await tx.productVariant.findUnique({
        where: { id: it.variantId },
        select: { id: true, stockQuantity: true },
      });
      if (!variant) {
        await tx.order.update({
          where: { id: input.orderId },
          data: {
            orderStatus: "cancelled",
            fulfillmentStatus: "cancelled",
          },
        });
        stockFailureCancelled = true;
        break;
      }
      if (variant.stockQuantity == null) {
        continue;
      }
      const dec = await tx.productVariant.updateMany({
        where: { id: variant.id, stockQuantity: { gte: it.quantity } },
        data: { stockQuantity: { decrement: it.quantity } },
      });
      if (dec.count === 0) {
        await tx.order.update({
          where: { id: input.orderId },
          data: {
            orderStatus: "cancelled",
            fulfillmentStatus: "cancelled",
          },
        });
        stockFailureCancelled = true;
        break;
      }
    } else if (it.productId) {
      const dec = await tx.product.updateMany({
        where: { id: it.productId, stockQuantity: { gte: it.quantity } },
        data: { stockQuantity: { decrement: it.quantity } },
      });
      if (dec.count === 0) {
        await tx.order.update({
          where: { id: input.orderId },
          data: {
            orderStatus: "cancelled",
            fulfillmentStatus: "cancelled",
          },
        });
        stockFailureCancelled = true;
        break;
      }
    }
  }

  if (!stockFailureCancelled && pendingWearOrder) {
    let wearStockFailed = false;
    for (const item of pendingWearOrder.items) {
      if (!item.wearProductVariantId) continue;
      const stock = await tx.wearProductVariant.updateMany({
        where: {
          id: item.wearProductVariantId,
          OR: [{ stockQuantity: null }, { stockQuantity: { gte: item.quantity } }],
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (stock.count === 0) {
        await tx.order.update({
          where: { id: input.orderId },
          data: {
            orderStatus: "cancelled",
            fulfillmentStatus: "cancelled",
          },
        });
        stockFailureCancelled = true;
        wearStockFailed = true;
        break;
      }
    }
    if (!wearStockFailed) {
      await tx.wearOrder.update({
        where: { id: pendingWearOrder.id },
        data: {
          status: "paid",
          paidAt,
          ...(input.stripeCheckoutSessionId ? { stripeCheckoutSessionId: input.stripeCheckoutSessionId } : {}),
          ...(input.stripePaymentId ? { stripePaymentIntentId: input.stripePaymentId } : {}),
          ...(typeof input.stripeTotalCents === "number"
            ? { amountTotalCents: Math.max(0, input.stripeTotalCents) }
            : {}),
        },
      });
      await tx.wearAnalyticsEvent.create({
        data: {
          kind: WEAR_EVENT_KINDS.purchaseSuccess,
          orderId: pendingWearOrder.id,
          payload: {
            stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
            amountTotalCents: input.stripeTotalCents ?? null,
            currency: input.currency,
            source: "mixed_checkout_settlement",
          },
        },
      });
    }
  }

  if (!stockFailureCancelled) {
    for (const it of bookingItems) {
      if (!it.bookingId) continue;
      const b = await tx.booking.findUnique({
        where: { id: it.bookingId },
        include: { experience: true },
      });
      if (!b || b.paymentStatus !== "pending") continue;

      let ticketRef = b.ticketRef;
      if (!ticketRef) {
        ticketRef = await allocateTicketRef(tx);
      }

      try {
        await safeReserveCapacity(tx, b.slotId, b.participantCount, b.seatType);
        if (b.classPackagePurchaseId) {
          if (!b.customerUserId) {
            throw new Error("Package credit requires authenticated customer");
          }
          const consumed = await consumePackageCreditForBooking(tx, {
            bookingId: b.id,
            purchaseId: b.classPackagePurchaseId,
            userId: b.customerUserId,
            studioId: b.studioId,
            experienceId: b.experienceId,
          });
          if (!consumed.ok) {
            throw new Error(consumed.error);
          }
        }

        const hasBalance = b.remainingBalanceCents > 0;
        const paymentStatus = hasBalance ? "partial" : "paid";
        const needsApproval = b.experience.bookingApprovalRequired;
        const nextStatus = needsApproval ? "awaiting_vendor_approval" : "confirmed";

        await tx.booking.update({
          where: { id: b.id },
          data: {
            ticketRef,
            bookingStatus: nextStatus,
            paymentStatus,
            depositPaidAt: b.depositPaidAt ?? paidAt,
          },
        });

        await tx.bookingAuditLog.create({
          data: {
            bookingId: b.id,
            actionType: needsApproval ? "payment_captured_pending_approval" : "confirmed",
            actorRole: "system",
            payload: {
              trigger: input.stripeCheckoutSessionId ? "stripe_webhook" : "checkout_completion",
              paymentStatus,
              needsApproval,
              provider: input.stripeAmountCents ? "stripe" : input.giftCardAmountCents ? "gift_card" : "manual",
              stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
            } as Prisma.InputJsonValue,
          },
        });

        if (needsApproval) pendingApprovalIds.push(b.id);
        else confirmedBookingIds.push(b.id);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Capacity exceeded at confirmation time";
        const paidNow = b.remainingBalanceCents > 0 ? "partial" : "paid";
        await tx.booking.update({
          where: { id: b.id },
          data: {
            ticketRef,
            bookingStatus: "cancelled_by_admin",
            paymentStatus: paidNow,
            notes: [b.notes, `AUTO-CANCELLED AFTER PAYMENT: ${reason}`].filter(Boolean).join("\n"),
          },
        });
        await tx.bookingCancellation.create({
          data: {
            bookingId: b.id,
            cancelledByRole: "admin",
            cancellationReason: "capacity_exceeded_after_payment",
            refundOutcome: "manual_refund_review_required",
            refundAmountCents: b.depositAmountCents || b.totalAmountCents,
          },
        });
        await tx.bookingAuditLog.create({
          data: {
            bookingId: b.id,
            actionType: "confirmation_failed",
            actorRole: "system",
            payload: {
              trigger: input.stripeCheckoutSessionId ? "stripe_webhook" : "checkout_completion",
              reason,
              provider: input.stripeAmountCents ? "stripe" : input.giftCardAmountCents ? "gift_card" : "manual",
              stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
            } as Prisma.InputJsonValue,
          },
        });
        autoCancelledIds.push(b.id);
      }
    }
  }

  if (input.cartId) {
    if (input.checkoutCartItemIds?.length) {
      await tx.cartItem.deleteMany({
        where: { cartId: input.cartId, id: { in: input.checkoutCartItemIds } },
      });
    } else {
      await tx.cartItem.deleteMany({ where: { cartId: input.cartId } });
    }
  }

  return { skip: false, confirmedBookingIds, pendingApprovalIds, autoCancelledIds, stockFailureCancelled };
}

export async function runCheckoutCompletionSideEffects(input: {
  orderId: string;
  confirmedBookingIds: string[];
  pendingApprovalIds: string[];
  autoCancelledIds: string[];
  stockFailureCancelled?: boolean;
  runSideEffect?: SideEffectRunner;
}) {
  const runSideEffect = input.runSideEffect ?? defaultSideEffectRunner;

  if (input.stockFailureCancelled) {
    await runSideEffect(`order_auto_refund_stock_failure:${input.orderId}`, async () => {
      const refunded = await executeAdminStripeOrderRefund({
        orderId: input.orderId,
        adminUserId: "system:stock-failure",
        reason: "Automatic refund due to stock conflict after checkout settlement",
      });
      if (!refunded.ok) {
        logApiError("checkout_completion_stock_failure_refund", new Error(refunded.error), {
          orderId: input.orderId,
        });
      }
    });
  }

  const loadBookingEmailContext = async (bookingIds: string[]) => {
    if (!bookingIds.length) return [];
    return prisma.orderItem.findMany({
      where: {
        orderId: input.orderId,
        itemType: "booking",
        bookingId: { in: bookingIds },
      },
      include: {
        booking: {
          include: {
            experience: true,
            slot: true,
            instructor: { select: { name: true } },
            bookingAddOns: true,
            intakeResponses: true,
          },
        },
        vendor: true,
      },
    });
  };

  const confirmedRows = await loadBookingEmailContext(input.confirmedBookingIds);
  const pendingRows = await loadBookingEmailContext(input.pendingApprovalIds);

  const emailBlock = (b: (typeof confirmedRows)[0]["booking"]) => {
    if (!b) return null;
    const slotDate = b.slot.slotDate.toISOString().slice(0, 10);
    return {
      experienceTitle: b.experience.title,
      studioName: "",
      slotDate,
      startTime: b.slot.startTime,
      participants: b.participantCount,
      totalEur: (b.totalAmountCents / 100).toFixed(2),
      ticketRef: b.ticketRef ?? "",
      paidEur: (b.depositAmountCents / 100).toFixed(2),
      balanceEur: (b.remainingBalanceCents / 100).toFixed(2),
      seatType: b.seatType,
      instructorName: b.instructor?.name ?? null,
      addOnLines: b.bookingAddOns.map((entry) =>
        entry.quantity > 1
          ? `${entry.addOnName} x${entry.quantity} (+€${((entry.unitPriceCents * entry.quantity) / 100).toFixed(2)})`
          : `${entry.addOnName} (+€${(entry.unitPriceCents / 100).toFixed(2)})`,
      ),
      intakeLines: b.intakeResponses.map((entry) => ({
        label: entry.labelSnapshot,
        value: entry.value,
      })),
    };
  };

  for (const it of confirmedRows) {
    const b = it.booking;
    if (!b || !it.vendor.email) continue;
    const base = emailBlock(b);
    if (!base) continue;
    base.studioName = it.vendor.displayName;
    const { customer, studio } = bookingConfirmationCopy(base);
    await runSideEffect(`booking_email_confirmed:${b.id}`, async () => {
      const enriched = await enrichCustomerEmailWithCalendar(b.id, customer);
      await sendBookingEmails({
        customerEmail: b.customerEmail,
        studioEmail: it.vendor.email,
        subject: `You're booked: ${b.experience.title}`,
        customerHtml: enriched.customerHtmlWithCalendar,
        customerAttachments: enriched.customerAttachments,
        studioHtml: studio,
      });
    });
  }

  for (const bid of input.confirmedBookingIds) {
    await runSideEffect(`calendar_sync:${bid}`, async () => {
      await syncBookingToGoogleCalendar(bid);
    });
  }

  for (const it of pendingRows) {
    const b = it.booking;
    if (!b || !it.vendor.email) continue;
    const base = emailBlock(b);
    if (!base) continue;
    base.studioName = it.vendor.displayName;
    const { customer, studio } = bookingPendingStudioConfirmationCopy(base);
    await runSideEffect(`booking_email_pending:${b.id}`, async () => {
      await sendBookingEmails({
        customerEmail: b.customerEmail,
        studioEmail: it.vendor.email,
        subject: `Waiting for studio: ${b.experience.title}`,
        customerHtml: customer,
        studioHtml: studio,
      });
    });
  }

  const cancelledRows = await loadBookingEmailContext(input.autoCancelledIds);
  for (const it of cancelledRows) {
    const b = it.booking;
    if (!b) continue;
    await runSideEffect(`booking_email_cancelled:${b.id}`, async () => {
      await sendBookingEmails({
        customerEmail: b.customerEmail,
        studioEmail: it.vendor?.email ?? "",
        subject: `Booking cancelled — ${b.experience.title}`,
        customerHtml: `<p>Hi ${b.customerName},</p><p>The class <strong>${b.experience.title}</strong> filled up before we could confirm your payment, so your booking was cancelled.</p><p>We're refunding €${((b.depositAmountCents || b.totalAmountCents) / 100).toFixed(2)}. Questions? Contact the studio.</p>`,
        studioHtml: `<p><strong>${b.customerName}</strong> (${b.customerEmail}) was auto-cancelled for <strong>${b.experience.title}</strong> — class was already full. Please review the refund.</p>`,
      });
    });
  }

  for (const bid of input.autoCancelledIds) {
    await runSideEffect(`calendar_remove_auto_cancel:${bid}`, async () => {
      await removeGoogleCalendarEventForBooking(bid);
    });
  }

  const productEmailItems = await prisma.orderItem.findMany({
    where: { orderId: input.orderId, itemType: "product" },
    include: {
      product: { select: { title: true } },
      vendor: { select: { id: true, displayName: true, email: true } },
    },
  });

  if (productEmailItems.length > 0) {
    const order = await prisma.order.findUnique({ where: { id: input.orderId } });
    if (order && order.orderStatus === "paid" && !order.orderConfirmationSentAt) {
      const studioNames = [...new Set(productEmailItems.map((i) => i.vendor.displayName))];
      const studioLabel = studioNames.length === 1 ? studioNames[0]! : `${studioNames.length} partner studios`;

      const customerLines = productEmailItems.map(
        (it) => `${it.vendor.displayName}: ${it.product?.title ?? "Product"} × ${it.quantity}`,
      );
      const totalEur = (order.totalCents / 100).toFixed(2);
      const { customer } = orderConfirmationCopy({
        customerName: order.customerName,
        studioName: studioLabel,
        items: customerLines,
        totalEur,
        shippingMethod: order.shippingMethod,
        trackingNumber: null,
      });

      await runSideEffect(`order_email_customer:${input.orderId}`, async () => {
        await sendOrderEmails({
          customerEmail: order.customerEmail,
          subject: `Order confirmed — ${studioLabel}`,
          customerHtml: customer,
        });
      });

      const byVendor = new Map<string, typeof productEmailItems>();
      for (const it of productEmailItems) {
        const list = byVendor.get(it.vendorId) ?? [];
        list.push(it);
        byVendor.set(it.vendorId, list);
      }

      for (const lines of byVendor.values()) {
        const v = lines[0]!.vendor;
        if (!v.email) continue;
        const vendorLineItems = lines.map((it) => `${it.product?.title ?? "Product"} × ${it.quantity}`);
        const vendorSubtotalCents = lines.reduce((sum, it) => sum + it.priceSnapshotCents * it.quantity, 0);
        const vendorTotalEur = (vendorSubtotalCents / 100).toFixed(2);
        const { vendor: vendorHtml } = orderConfirmationCopy({
          customerName: order.customerName,
          studioName: v.displayName,
          items: vendorLineItems,
          totalEur: vendorTotalEur,
          shippingMethod: null,
          trackingNumber: null,
        });
        await runSideEffect(`order_email_vendor:${v.id}:${input.orderId}`, async () => {
          await sendOrderEmails({
            vendorEmail: v.email,
            subject: `New order — ${order.customerName}`,
            vendorHtml,
          });
        });
      }

      await prisma.order.update({
        where: { id: input.orderId },
        data: { orderConfirmationSentAt: new Date(), vendorNotificationSentAt: new Date() },
      });
    }
  }
}
