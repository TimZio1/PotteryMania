import type { PrismaClient } from "@prisma/client";
import type { CheckoutLineRow } from "@/lib/checkout-line-rows";
import { allocateTicketRef } from "@/lib/bookings/ticket-ref";
import { couponHasRedemptionCapacity, lockCouponRow } from "@/lib/coupon-redemption-lock";
import { reserveGiftCardRedemption } from "@/lib/gift-cards/checkout";

type ShippingAddressJson = {
  line1: string;
  line2: string;
  city: string;
  country: string;
  postal: string;
};

type CreatePendingOrderInput = {
  prisma: PrismaClient;
  lineRows: CheckoutLineRow[];
  studioId: string;
  customer: {
    userId: string | null;
    name: string;
    email: string;
    phone: string | null;
  };
  orderMeta: {
    shippingAddressJson: ShippingAddressJson;
    billingAddress?: Record<string, unknown>;
    notes?: string | null;
    hasProducts: boolean;
    shippingMethod: string;
    shippingCents: number;
    taxCents: number;
    subtotalCents: number;
    totalCents: number;
  };
  couponIdForMeta: string | null;
  giftCardForMeta: { id: string } | null;
  giftCardAppliedCents: number;
};

export async function createPendingCheckoutOrder(input: CreatePendingOrderInput) {
  return input.prisma.$transaction(async (tx) => {
    if (input.couponIdForMeta) {
      await lockCouponRow(tx, input.couponIdForMeta);
      const cap = await couponHasRedemptionCapacity(tx, input.couponIdForMeta);
      if (!cap) {
        throw new Error("COUPON_EXHAUSTED");
      }
    }

    const createdOrder = await tx.order.create({
      data: {
        customerUserId: input.customer.userId,
        customerName: input.customer.name,
        customerEmail: input.customer.email,
        customerPhone: input.customer.phone,
        shippingAddressJson: input.orderMeta.shippingAddressJson,
        billingAddressJson: input.orderMeta.billingAddress as object | undefined,
        notes: input.orderMeta.notes ?? null,
        orderStatus: "pending",
        paymentStatus: "pending",
        fulfillmentStatus: input.orderMeta.hasProducts ? "pending" : "processing",
        shippingMethod: input.orderMeta.shippingMethod,
        shippingRateCents: input.orderMeta.shippingCents,
        taxCents: input.orderMeta.taxCents,
        subtotalCents: input.orderMeta.subtotalCents,
        totalCents: input.orderMeta.totalCents,
        currency: "EUR",
      },
    });

    for (const row of input.lineRows) {
      if (row.itemType === "product" && row.productId) {
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            itemType: "product",
            productId: row.productId,
            variantId: row.variantId ?? null,
            vendorId: input.studioId,
            quantity: row.quantity,
            priceSnapshotCents: row.chargedLineCents,
            commissionSnapshotCents: row.commissionCents,
            vendorAmountSnapshotCents: row.vendorCents,
          },
        });
        continue;
      }

      if (row.itemType === "booking" && row.experienceId && row.slotId && row.participantCount) {
        const ticketRef = await allocateTicketRef(tx);
        const bookingDiscountCents = Math.max(0, row.originalChargedLineCents - row.chargedLineCents);
        const bookingNetTotalCents = Math.max(0, row.fullLineCents - bookingDiscountCents);
        const booking = await tx.booking.create({
          data: {
            studioId: input.studioId,
            experienceId: row.experienceId,
            slotId: row.slotId,
            customerUserId: input.customer.userId,
            customerName: input.customer.name,
            customerEmail: input.customer.email,
            customerPhone: input.customer.phone,
            participantCount: row.participantCount,
            seatType: row.seatType ?? null,
            instructorId: row.instructorId ?? null,
            ticketRef,
            bookingStatus: "pending",
            paymentStatus: "pending",
            totalAmountCents: bookingNetTotalCents,
            depositAmountCents: row.chargedLineCents,
            remainingBalanceCents: Math.max(0, bookingNetTotalCents - row.chargedLineCents),
            classPackagePurchaseId: row.classPackagePurchaseId ?? null,
            remainderPaymentLink: null,
            commissionAmountCents: row.commissionCents,
            vendorAmountCents: row.vendorCents,
            cancellationPolicySnapshot: row.policySnapshot,
            notes: row.notes ?? input.orderMeta.notes ?? null,
          },
        });

        if (row.addOnSelections?.length) {
          await tx.bookingAddOn.createMany({
            data: row.addOnSelections.map((selection) => ({
              bookingId: booking.id,
              addOnId: selection.addOnId,
              addOnName: selection.name,
              quantity: selection.quantity,
              unitPriceCents: selection.unitPriceCents,
              durationMinutesExtra: selection.durationMinutesExtra,
            })),
          });
        }

        if (row.intakeResponses?.length) {
          await tx.intakeFormResponse.createMany({
            data: row.intakeResponses.map((response) => ({
              bookingId: booking.id,
              formId: response.formId,
              labelSnapshot: response.label,
              fieldTypeSnapshot: response.fieldType,
              includeInInvoiceSnapshot: response.includeInInvoice,
              value: response.value,
            })),
          });
        }

        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            itemType: "booking",
            bookingId: booking.id,
            vendorId: input.studioId,
            quantity: 1,
            participantCount: row.participantCount,
            priceSnapshotCents: row.chargedLineCents,
            commissionSnapshotCents: row.commissionCents,
            vendorAmountSnapshotCents: row.vendorCents,
          },
        });
      }
    }

    if (input.orderMeta.hasProducts) {
      await tx.shippingRateQuote.create({
        data: {
          orderId: createdOrder.id,
          studioId: input.studioId,
          destinationCountry: input.orderMeta.shippingAddressJson.country || "GR",
          destinationCity: input.orderMeta.shippingAddressJson.city || null,
          subtotalCents: input.orderMeta.subtotalCents,
          shippingCents: input.orderMeta.shippingCents,
          methodLabel: input.orderMeta.shippingMethod,
        },
      });
    }

    if (input.giftCardForMeta && input.giftCardAppliedCents > 0) {
      await reserveGiftCardRedemption(tx, {
        giftCardId: input.giftCardForMeta.id,
        orderId: createdOrder.id,
        redeemedByUserId: input.customer.userId,
        amountCents: input.giftCardAppliedCents,
      });
    }

    return createdOrder;
  });
}
