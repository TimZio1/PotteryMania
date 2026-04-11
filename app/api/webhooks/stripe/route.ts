import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import {
  sendBookingEmails,
  bookingConfirmationCopy,
  bookingPendingStudioConfirmationCopy,
} from "@/lib/email/booking-notify";
import { orderConfirmationCopy, sendOrderEmails } from "@/lib/email/order-notify";
import { safeReserveCapacity } from "@/lib/bookings/slot-lock";
import { allocateTicketRef } from "@/lib/bookings/ticket-ref";
import type { Prisma } from "@prisma/client";
import {
  markActivationsEndedForStripeSubscription,
  syncStudioBillingSubscriptionFromStripe,
} from "@/lib/studio-feature-billing";
import { recordStudioFeatureActivationEvent } from "@/lib/studio-feature-activation-events";
import { removeGoogleCalendarEventForBooking, syncBookingToGoogleCalendar } from "@/lib/calendar/google-sync";
import { enrichCustomerEmailWithCalendar } from "@/lib/calendar/booking-email-calendar";
import { WEAR_EVENT_KINDS } from "@/lib/wear-event-kinds";
import { submitPaidWearOrderToSpreadconnect } from "@/lib/wear-order-spreadconnect";
import {
  claimStripeWebhookEvent,
  markStripeWebhookProcessed,
} from "@/lib/stripe-webhook-dedup";
import { runStripeWebhookSideEffect } from "@/lib/webhook-event-store";
import { scheduleWearOrderNotification } from "@/lib/wear-order-notifications";
import { logApiError } from "@/lib/monitoring";
import { couponHasRedemptionCapacity, lockCouponRow } from "@/lib/coupon-redemption-lock";
import {
  mapStripeSubscriptionStatus,
  recordOfferingSubscriptionEvent,
  syncOfferingSubscriptionFromStripeSubscription,
} from "@/lib/offering-subscriptions";

/**
 * Payment + manual approval policy: Stripe success always reserves slot capacity (via safeReserveCapacity).
 * If experience.bookingApprovalRequired, booking becomes awaiting_vendor_approval until vendor approves → confirmed.
 * Reject (vendor) releases capacity; customer/vendor cancel via API attempts Stripe refund when policy allows (`stripe-refund-booking`).
 */

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    logApiError("stripe_webhook_signature", e, {}, req);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const claim = await claimStripeWebhookEvent(event.id, event.type, {
    type: event.type,
    livemode: event.livemode,
  });
  if (claim === "duplicate_done") {
    return NextResponse.json({ received: true, idempotent: true });
  }
  const ack = async () => {
    await markStripeWebhookProcessed(event.id);
    return NextResponse.json({ received: true });
  };

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const now = new Date();
    const row = await prisma.offeringSubscription.findUnique({
      where: { stripeSubscriptionId: sub.id },
      select: { id: true },
    });
    if (row) {
      await prisma.offeringSubscription.update({
        where: { id: row.id },
        data: {
          status: "canceled",
          autoRenew: false,
          cancelAtPeriodEnd: false,
          canceledAt: now,
          endedAt: now,
          nextBillingDate: null,
        },
      });
      await recordOfferingSubscriptionEvent(row.id, "canceled", { source: "customer.subscription.deleted" });
      return ack();
    }
    await markActivationsEndedForStripeSubscription(sub.id);
    return ack();
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const row = await prisma.offeringSubscription.findUnique({
      where: { stripeSubscriptionId: sub.id },
      select: { id: true },
    });
    if (row) {
      await syncOfferingSubscriptionFromStripeSubscription(sub);
      return ack();
    }
    await syncStudioBillingSubscriptionFromStripe(sub);
    return ack();
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const invoiceAny = invoice as unknown as { id?: string; subscription?: unknown };
    const subId =
      typeof invoiceAny.subscription === "string"
        ? invoiceAny.subscription
        : (invoiceAny.subscription as { id?: string } | null)?.id;
    if (!subId) return ack();
    const row = await prisma.offeringSubscription.findUnique({ where: { stripeSubscriptionId: subId } });
    if (!row) return ack();

    const now = new Date();
    const nextFailures = row.failedPaymentCount + 1;
    const graceEndsAt = new Date(now.getTime() + row.gracePeriodDays * 24 * 60 * 60 * 1000);
    let nextStatus: "past_due" | "paused" | "canceled" = "past_due";
    let endedAt: Date | null = null;
    if (nextFailures >= row.paymentRetryMax && row.failedPaymentAction === "pause") {
      nextStatus = "paused";
    } else if (nextFailures >= row.paymentRetryMax && row.failedPaymentAction === "cancel") {
      nextStatus = "canceled";
      endedAt = now;
      if (row.stripeSubscriptionId) {
        try {
          await getStripe().subscriptions.cancel(row.stripeSubscriptionId);
        } catch {
          // non-fatal; local status still marks cancel intent and next sync can reconcile
        }
      }
    }
    await prisma.offeringSubscription.update({
      where: { id: row.id },
      data: {
        status: nextStatus,
        failedPaymentCount: nextFailures,
        graceEndsAt,
        endedAt,
      },
    });
    await recordOfferingSubscriptionEvent(row.id, "payment_failed", {
      invoiceId: invoice.id,
      attempts: nextFailures,
      status: nextStatus,
    });
    return ack();
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const invoiceAny = invoice as unknown as { id?: string; subscription?: unknown; lines?: { data?: unknown[] } };
    const subId =
      typeof invoiceAny.subscription === "string"
        ? invoiceAny.subscription
        : (invoiceAny.subscription as { id?: string } | null)?.id;
    if (!subId) return ack();
    const row = await prisma.offeringSubscription.findUnique({ where: { stripeSubscriptionId: subId } });
    if (!row) return ack();

    const firstLine = (invoiceAny.lines?.data?.[0] as { period?: { start?: number; end?: number } } | undefined) ?? undefined;
    const linePeriod = firstLine?.period;
    const currentPeriodStart = linePeriod?.start ? new Date(linePeriod.start * 1000) : row.currentPeriodStart;
    const currentPeriodEnd = linePeriod?.end ? new Date(linePeriod.end * 1000) : row.currentPeriodEnd;
    await prisma.offeringSubscription.update({
      where: { id: row.id },
      data: {
        status: row.cancelAtPeriodEnd ? "pending_cancel" : "active",
        failedPaymentCount: 0,
        graceEndsAt: null,
        currentPeriodStart: currentPeriodStart ?? null,
        currentPeriodEnd: currentPeriodEnd ?? null,
        nextBillingDate: currentPeriodEnd ?? null,
        cyclesBilled: { increment: 1 },
      },
    });
    await recordOfferingSubscriptionEvent(row.id, "payment_recovered", { invoiceId: invoiceAny.id ?? null });
    return ack();
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return ack();
    }

    if (session.metadata?.type === "offering_subscription") {
      const targetType = session.metadata.targetType;
      const productId = session.metadata.productId ?? null;
      const experienceId = session.metadata.experienceId ?? null;
      const studioId = session.metadata.studioId;
      const userId = session.metadata.userId;
      const priceSnapshotCents = parseInt(session.metadata.priceSnapshotCents ?? "0", 10);
      const billingInterval = session.metadata.billingInterval;
      const billingIntervalCount = parseInt(session.metadata.billingIntervalCount ?? "1", 10) || 1;
      const minimumCommitmentCycles = parseInt(session.metadata.minimumCommitmentCycles ?? "0", 10) || null;
      const trialPeriodDays = parseInt(session.metadata.trialPeriodDays ?? "0", 10) || null;
      const gracePeriodDays = parseInt(session.metadata.gracePeriodDays ?? "3", 10) || 3;
      const paymentRetryMax = parseInt(session.metadata.paymentRetryMax ?? "3", 10) || 3;
      const pricingVersion = parseInt(session.metadata.pricingVersion ?? "1", 10) || 1;
      const failedPaymentAction = session.metadata.failedPaymentAction === "cancel" ? "cancel" : "pause";
      const autoRenew = session.metadata.autoRenew !== "0";
      const subRaw = session.subscription;
      const stripeSubscriptionId = typeof subRaw === "string" ? subRaw : subRaw?.id ?? null;
      const custRaw = session.customer;
      const stripeCustomerId = typeof custRaw === "string" ? custRaw : custRaw?.id ?? null;

      if (
        stripeSubscriptionId &&
        studioId &&
        userId &&
        (targetType === "product" || targetType === "experience") &&
        billingInterval &&
        (billingInterval === "weekly" || billingInterval === "monthly" || billingInterval === "custom")
      ) {
        let stripeSub: Stripe.Subscription | null = null;
        try {
          stripeSub = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
        } catch {
          stripeSub = null;
        }
        const stripeSubAny = stripeSub as unknown as {
          current_period_start?: number;
          current_period_end?: number;
          trial_end?: number | null;
          status?: Stripe.Subscription.Status;
        } | null;
        const now = new Date();
        const currentPeriodStart =
          stripeSubAny?.current_period_start != null ? new Date(stripeSubAny.current_period_start * 1000) : now;
        const currentPeriodEnd =
          stripeSubAny?.current_period_end != null ? new Date(stripeSubAny.current_period_end * 1000) : null;
        const trialEndsAt = stripeSubAny?.trial_end ? new Date(stripeSubAny.trial_end * 1000) : null;
        const status = stripeSubAny?.status ? mapStripeSubscriptionStatus(stripeSubAny.status) : "active";
        const saved = await prisma.offeringSubscription.upsert({
          where: { stripeSubscriptionId },
          create: {
            studioId,
            userId,
            targetType,
            productId: targetType === "product" ? productId : null,
            experienceId: targetType === "experience" ? experienceId : null,
            customerEmail: session.customer_details?.email ?? "",
            customerName: session.customer_details?.name ?? null,
            status,
            priceSnapshotCents,
            billingInterval,
            billingIntervalCount,
            minimumCommitmentCycles,
            autoRenew,
            trialEndsAt,
            currentPeriodStart,
            currentPeriodEnd,
            nextBillingDate: currentPeriodEnd,
            paymentRetryMax,
            gracePeriodDays,
            failedPaymentAction,
            pricingVersion,
            stripeCustomerId,
            stripeSubscriptionId,
          },
          update: {
            status,
            customerEmail: session.customer_details?.email ?? undefined,
            customerName: session.customer_details?.name ?? null,
            currentPeriodStart,
            currentPeriodEnd,
            nextBillingDate: currentPeriodEnd,
            trialEndsAt,
            paymentRetryMax,
            gracePeriodDays,
            failedPaymentAction,
            autoRenew,
            pricingVersion,
            stripeCustomerId,
          },
        });
        await recordOfferingSubscriptionEvent(saved.id, "checkout_completed", {
          sessionId: session.id,
          stripeSubscriptionId,
          billingInterval,
          billingIntervalCount,
          trialPeriodDays,
        });
      }
      return ack();
    }

    // --- Studio add-on subscription (platform Billing) ---
    if (session.metadata?.type === "studio_feature_subscription") {
      const studioId = session.metadata.studioId;
      const featureId = session.metadata.featureId;
      const subRaw = session.subscription;
      const subscriptionId = typeof subRaw === "string" ? subRaw : subRaw?.id ?? null;
      const custRaw = session.customer;
      const customerId = typeof custRaw === "string" ? custRaw : custRaw?.id ?? null;
      if (studioId && featureId && subscriptionId) {
        const feature = await prisma.platformFeature.findUnique({ where: { id: featureId } });
        if (feature) {
          if (customerId) {
            await prisma.studio.updateMany({
              where: { id: studioId },
              data: { stripePlatformCustomerId: customerId },
            });
          }
          let stripeSubscriptionItemId: string | null = null;
          const priceId = feature.stripePriceId?.trim();
          if (priceId?.startsWith("price_")) {
            try {
              const stripe = getStripe();
              const fullSub = await stripe.subscriptions.retrieve(subscriptionId, {
                expand: ["items.data.price"],
              });
              const match = (fullSub.items?.data ?? []).find((it) => {
                const p = it.price;
                const pid = typeof p === "string" ? p : p?.id;
                return pid === priceId;
              });
              stripeSubscriptionItemId = match?.id ?? null;
            } catch (e) {
              logApiError("stripe_webhook_feature_sub_item", e, { subscriptionId, priceId }, req);
            }
          }
          const now = new Date();
          await prisma.studioFeatureActivation.upsert({
            where: { studioId_featureId: { studioId, featureId } },
            create: {
              studioId,
              featureId,
              status: "active",
              activatedAt: now,
              stripeSubscriptionId: subscriptionId,
              stripeSubscriptionItemId,
            },
            update: {
              status: "active",
              activatedAt: now,
              stripeSubscriptionId: subscriptionId,
              stripeSubscriptionItemId,
              deactivatesAt: null,
            },
          });
          await prisma.studioFeatureRequest.upsert({
            where: { studioId_featureKey: { studioId, featureKey: feature.slug } },
            create: { studioId, featureKey: feature.slug, desiredOn: true },
            update: { desiredOn: true },
          });
          await recordStudioFeatureActivationEvent(prisma, {
            studioId,
            featureId,
            kind: "checkout_single",
            stripeSubscriptionId: subscriptionId,
            stripeCheckoutSessionId: session.id,
            payload: { checkoutSessionId: session.id },
          });
        }
      }
      return ack();
    }

    if (session.metadata?.type === "studio_feature_bundle") {
      const studioId = session.metadata.studioId;
      const ids =
        session.metadata.featureIds
          ?.split(",")
          .map((x) => x.trim())
          .filter(Boolean) ?? [];
      const subRaw = session.subscription;
      const subscriptionId = typeof subRaw === "string" ? subRaw : subRaw?.id ?? null;
      const custRaw = session.customer;
      const customerId = typeof custRaw === "string" ? custRaw : custRaw?.id ?? null;
      if (studioId && subscriptionId && ids.length) {
        if (customerId) {
          await prisma.studio.updateMany({
            where: { id: studioId },
            data: { stripePlatformCustomerId: customerId },
          });
        }
        const now = new Date();
        const features = await prisma.platformFeature.findMany({ where: { id: { in: ids } } });
        for (const feature of features) {
          await prisma.studioFeatureActivation.upsert({
            where: { studioId_featureId: { studioId, featureId: feature.id } },
            create: {
              studioId,
              featureId: feature.id,
              status: "active",
              activatedAt: now,
              stripeSubscriptionId: subscriptionId,
            },
            update: {
              status: "active",
              activatedAt: now,
              stripeSubscriptionId: subscriptionId,
              deactivatesAt: null,
            },
          });
          await prisma.studioFeatureRequest.upsert({
            where: { studioId_featureKey: { studioId, featureKey: feature.slug } },
            create: { studioId, featureKey: feature.slug, desiredOn: true },
            update: { desiredOn: true },
          });
          await recordStudioFeatureActivationEvent(prisma, {
            studioId,
            featureId: feature.id,
            kind: "checkout_bundle",
            stripeSubscriptionId: subscriptionId,
            stripeCheckoutSessionId: session.id,
            payload: {
              checkoutSessionId: session.id,
              bundleId: session.metadata.bundleId ?? null,
            },
          });
        }
      }
      return ack();
    }

    // --- Studio activation (platform-level, no Connect) ---
    if (session.metadata?.type === "studio_activation") {
      const studioId = session.metadata.studioId;
      if (studioId) {
        await prisma.studio.updateMany({
          where: { id: studioId, activationPaidAt: null },
          data: { activationPaidAt: new Date(), activationSessionId: session.id },
        });
      }
      return ack();
    }

    // --- AI insight one-time purchase (platform account) ---
    if (session.metadata?.type === "insight_purchase") {
      const insightId = session.metadata.insightId;
      const studioId = session.metadata.studioId;
      const userId = session.metadata.userId;
      const pi = session.payment_intent;
      const piId = typeof pi === "string" ? pi : pi?.id ?? null;
      const amount = session.amount_total ?? 0;
      if (insightId && studioId && userId && piId) {
        try {
          await prisma.$transaction(async (tx) => {
            const insight = await tx.generatedInsight.findFirst({
              where: { id: insightId, studioId },
            });
            if (!insight || insight.status === "purchased") return;
            if (insight.status !== "generated" && insight.status !== "viewed") return;
            await tx.generatedInsight.update({
              where: { id: insightId },
              data: { status: "purchased", purchasedAt: new Date() },
            });
            const existing = await tx.insightPurchase.findUnique({ where: { insightId } });
            if (!existing) {
              await tx.insightPurchase.create({
                data: {
                  insightId,
                  studioId,
                  userId,
                  amountCents: amount,
                  stripePaymentIntentId: piId,
                },
              });
            }
          });
        } catch (e) {
          logApiError("stripe_webhook_insight_purchase", e, { insightId, studioId }, req);
        }
      }
      return ack();
    }

    // --- PotteryMania native wear (platform Checkout, no Connect) ---
    if (session.metadata?.type === "wear_order") {
      const wearOrderId = session.metadata.wearOrderId;
      if (wearOrderId) {
        const pi = session.payment_intent;
        const piId = typeof pi === "string" ? pi : pi?.id ?? null;
        const amountTotal = session.amount_total ?? null;
        try {
          const applied = await prisma.$transaction(async (tx) => {
            const lockedRows = await tx.$queryRawUnsafe<{ id: string; status: string; stripe_checkout_session_id: string | null }[]>(
              `SELECT id, status::text, stripe_checkout_session_id
               FROM wear_orders
               WHERE id = $1::uuid
               FOR UPDATE`,
              wearOrderId
            );
            if (!lockedRows.length || lockedRows[0].status !== "pending") return false;
            if (lockedRows[0].stripe_checkout_session_id && lockedRows[0].stripe_checkout_session_id !== session.id) return false;

            const order = await tx.wearOrder.findUnique({
              where: { id: wearOrderId },
              include: { items: true },
            });
            if (!order || order.status !== "pending") return false;

            const paidNow = new Date();
            await tx.wearOrder.update({
              where: { id: wearOrderId },
              data: {
                status: "paid",
                paidAt: order.paidAt ?? paidNow,
                stripeCheckoutSessionId: session.id,
                stripePaymentIntentId: piId,
                ...(amountTotal != null ? { amountTotalCents: amountTotal } : {}),
              },
            });

            for (const item of order.items) {
              if (!item.wearProductVariantId) continue;
              const updatedStock = await tx.wearProductVariant.updateMany({
                where: {
                  id: item.wearProductVariantId,
                  OR: [{ stockQuantity: null }, { stockQuantity: { gte: item.quantity } }],
                },
                data: {
                  ...(typeof item.quantity === "number" ? { stockQuantity: { decrement: item.quantity } } : {}),
                },
              });
              if (updatedStock.count === 0) {
                throw new Error(`WEAR_STOCK_RACE:${item.wearProductVariantId}`);
              }
            }

            await tx.wearAnalyticsEvent.create({
              data: {
                kind: WEAR_EVENT_KINDS.purchaseSuccess,
                orderId: wearOrderId,
                payload: {
                  stripeCheckoutSessionId: session.id,
                  amountTotalCents: amountTotal,
                  currency: session.currency ?? null,
                },
              },
            });
            return true;
          });

          if (applied) {
            scheduleWearOrderNotification("order_confirmed", wearOrderId);
            await runStripeWebhookSideEffect(event.id, `wear_spreadconnect:${wearOrderId}`, async () => {
              const stripe = getStripe();
              const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
                expand: ["shipping_cost.shipping_rate"],
              });
              await submitPaidWearOrderToSpreadconnect({
                wearOrderId,
                stripeSession: fullSession,
              });
            });
          }
        } catch (e) {
          logApiError("stripe_webhook_wear_order", e, { wearOrderId }, req);
        }
      }
      return ack();
    }

    // --- Order / booking checkout (via Connect) ---
    const orderId = session.metadata?.orderId;
    if (!orderId) return ack();
    const pi = session.payment_intent;
    const piId = typeof pi === "string" ? pi : pi?.id ?? null;
    const processed = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<
        { id: string; order_status: string; total_cents: number; customer_user_id: string | null }[]
      >(
        `SELECT id, order_status::text, total_cents, customer_user_id
         FROM orders
         WHERE id = $1::uuid
         FOR UPDATE`,
        orderId
      );
      if (!rows.length || rows[0].order_status === "paid") {
        return { skip: true, confirmedBookingIds: [] as string[], pendingApprovalIds: [] as string[], autoCancelledIds: [] as string[] };
      }
      const amount = session.amount_total ?? rows[0].total_cents;

      await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: "paid", paymentStatus: "paid" },
      });

      const existingPay = await tx.payment.findFirst({ where: { orderId } });
      if (!existingPay) {
        await tx.payment.create({
          data: {
            orderId,
            provider: "stripe",
            providerPaymentId: piId,
            paymentStatus: "succeeded",
            amountCents: amount,
            currency: (session.currency || "eur").toUpperCase(),
          },
        });
      }

      const metaCouponId = session.metadata?.couponId;
      const metaDiscount = session.metadata?.discountCents;
      if (metaCouponId && metaDiscount) {
        const dc = parseInt(String(metaDiscount), 10);
        if (!Number.isNaN(dc) && dc > 0) {
          const dup = await tx.discountRedemption.findFirst({ where: { orderId } });
          if (!dup) {
            await lockCouponRow(tx, metaCouponId);
            const cap = await couponHasRedemptionCapacity(tx, metaCouponId);
            if (cap) {
              await tx.discountRedemption.create({
                data: {
                  couponId: metaCouponId,
                  orderId,
                  userId: rows[0].customer_user_id,
                  amountCents: dc,
                },
              });
              await tx.coupon.update({
                where: { id: metaCouponId },
                data: { redeemedCount: { increment: 1 } },
              });
            } else {
              logApiError(
                "stripe_webhook_coupon_cap",
                new Error("Coupon max redemptions exceeded after payment"),
                { orderId, couponId: metaCouponId },
                req,
              );
            }
          }
        }
      }

      const items = await tx.orderItem.findMany({ where: { orderId } });
      const confirmedBookingIds: string[] = [];
      const pendingApprovalIds: string[] = [];
      const autoCancelledIds: string[] = [];

      for (const it of items) {
        if (it.itemType === "product" && it.productId) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stockQuantity: { decrement: it.quantity } },
          });
        }
        if (it.itemType === "booking" && it.bookingId) {
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
              },
            });

            await tx.bookingAuditLog.create({
              data: {
                bookingId: b.id,
                actionType: needsApproval ? "payment_captured_pending_approval" : "confirmed",
                actorRole: "system",
                payload: {
                  trigger: "stripe_webhook",
                  sessionId: session.id,
                  paymentStatus,
                  needsApproval,
                } as Prisma.InputJsonValue,
              },
            });

            if (needsApproval) pendingApprovalIds.push(b.id);
            else confirmedBookingIds.push(b.id);
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : "Capacity exceeded at confirmation time";
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
                  trigger: "stripe_webhook",
                  sessionId: session.id,
                  reason,
                } as Prisma.InputJsonValue,
              },
            });
            autoCancelledIds.push(b.id);
          }
        }
      }

      const cartId = session.metadata?.cartId;
      const checkoutCartItemIds = session.metadata?.checkoutCartItemIds
        ?.split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      if (cartId) {
        if (checkoutCartItemIds?.length) {
          await tx.cartItem.deleteMany({
            where: { cartId, id: { in: checkoutCartItemIds } },
          });
        } else {
          await tx.cartItem.deleteMany({ where: { cartId } });
        }
      }
      return { skip: false, confirmedBookingIds, pendingApprovalIds, autoCancelledIds };
    });
    if (processed.skip) {
      return ack();
    }

    const loadBookingEmailContext = async (bookingIds: string[]) => {
      if (!bookingIds.length) return [];
      return prisma.orderItem.findMany({
        where: {
          orderId,
          itemType: "booking",
          bookingId: { in: bookingIds },
        },
        include: {
          booking: { include: { experience: true, slot: true } },
          vendor: true,
        },
      });
    };

    const confirmedRows = await loadBookingEmailContext(processed.confirmedBookingIds);
    const pendingRows = await loadBookingEmailContext(processed.pendingApprovalIds);

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
      };
    };

    for (const it of confirmedRows) {
      const b = it.booking;
      if (!b || !it.vendor.email) continue;
      const base = emailBlock(b);
      if (!base) continue;
      base.studioName = it.vendor.displayName;
      const { customer, studio } = bookingConfirmationCopy(base);
      await runStripeWebhookSideEffect(event.id, `booking_email_confirmed:${b.id}`, async () => {
        const enriched = await enrichCustomerEmailWithCalendar(b.id, customer);
        await sendBookingEmails({
          customerEmail: b.customerEmail,
          studioEmail: it.vendor.email,
          subject: `Booking confirmed: ${b.experience.title}`,
          customerHtml: enriched.customerHtmlWithCalendar,
          customerAttachments: enriched.customerAttachments,
          studioHtml: studio,
        });
      });
    }

    for (const bid of processed.confirmedBookingIds) {
      await runStripeWebhookSideEffect(event.id, `calendar_sync:${bid}`, async () => {
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
      await runStripeWebhookSideEffect(event.id, `booking_email_pending:${b.id}`, async () => {
        await sendBookingEmails({
          customerEmail: b.customerEmail,
          studioEmail: it.vendor.email,
          subject: `Booking received — approval pending: ${b.experience.title}`,
          customerHtml: customer,
          studioHtml: studio,
        });
      });
    }

    // Notify customers whose bookings were auto-cancelled due to capacity
    const cancelledRows = await loadBookingEmailContext(processed.autoCancelledIds);
    for (const it of cancelledRows) {
      const b = it.booking;
      if (!b) continue;
      await runStripeWebhookSideEffect(event.id, `booking_email_cancelled:${b.id}`, async () => {
        await sendBookingEmails({
          customerEmail: b.customerEmail,
          studioEmail: it.vendor?.email ?? "",
          subject: `Booking cancelled — ${b.experience.title}`,
          customerHtml: `<p>Hi ${b.customerName},</p><p>Unfortunately your booking for <strong>${b.experience.title}</strong> was automatically cancelled because the session reached capacity before your payment could be confirmed.</p><p>A refund of €${((b.depositAmountCents || b.totalAmountCents) / 100).toFixed(2)} will be processed. If you have questions, contact the studio directly.</p>`,
          studioHtml: `<p>Booking for <strong>${b.customerName}</strong> (${b.customerEmail}) was auto-cancelled for <strong>${b.experience.title}</strong> due to capacity. A refund review is required.</p>`,
        });
      });
    }

    for (const bid of processed.autoCancelledIds) {
      await runStripeWebhookSideEffect(event.id, `calendar_remove_auto_cancel:${bid}`, async () => {
        await removeGoogleCalendarEventForBooking(bid);
      });
    }

    const productEmailItems = await prisma.orderItem.findMany({
      where: { orderId, itemType: "product" },
      include: {
        product: { select: { title: true } },
        vendor: { select: { id: true, displayName: true, email: true } },
      },
    });

    if (productEmailItems.length > 0) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order && !order.orderConfirmationSentAt) {
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

        await runStripeWebhookSideEffect(event.id, `order_email_customer:${orderId}`, async () => {
          await sendOrderEmails({
            customerEmail: order.customerEmail,
            subject: `Order confirmed — PotteryMania`,
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
          await runStripeWebhookSideEffect(event.id, `order_email_vendor:${v.id}:${orderId}`, async () => {
            await sendOrderEmails({
              vendorEmail: v.email,
              subject: `New order — ${order.customerName}`,
              vendorHtml,
            });
          });
        }

        await prisma.order.update({
          where: { id: orderId },
          data: { orderConfirmationSentAt: new Date(), vendorNotificationSentAt: new Date() },
        });
      }
    }

    return ack();
  }

  return ack();
}
