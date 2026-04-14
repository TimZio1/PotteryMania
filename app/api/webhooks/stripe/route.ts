import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import {
  markActivationsEndedForStripeSubscription,
  syncStudioBillingSubscriptionFromStripe,
} from "@/lib/studio-feature-billing";
import { recordStudioFeatureActivationEvent } from "@/lib/studio-feature-activation-events";
import { WEAR_EVENT_KINDS } from "@/lib/wear-event-kinds";
import { submitPaidWearOrderToSpreadconnect } from "@/lib/wear-order-spreadconnect";
import {
  claimStripeWebhookEvent,
  markStripeWebhookProcessed,
} from "@/lib/stripe-webhook-dedup";
import { runStripeWebhookSideEffect } from "@/lib/webhook-event-store";
import { scheduleWearOrderNotification } from "@/lib/wear-order-notifications";
import { logApiError } from "@/lib/monitoring";
import {
  mapStripeSubscriptionStatus,
  recordOfferingSubscriptionEvent,
  syncOfferingSubscriptionFromStripeSubscription,
} from "@/lib/offering-subscriptions";
import { giftCardEmailCopy, sendGiftCardEmail } from "@/lib/gift-cards/email";
import { releaseGiftCardRedemptionsForSession } from "@/lib/gift-cards/checkout";
import { runCheckoutCompletionSideEffects, settleCheckoutOrderPayment } from "@/lib/orders/checkout-completion";
import { settleBookingRemainderPayment } from "@/lib/bookings/remainder";
import { orderPaymentFailedCopy, sendOrderEmails } from "@/lib/email/order-notify";

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

    if (session.metadata?.type === "gift_card_purchase") {
      const giftCardId = session.metadata.giftCardId;
      const paymentIntentRaw = session.payment_intent;
      const stripePaymentIntentId =
        typeof paymentIntentRaw === "string" ? paymentIntentRaw : paymentIntentRaw?.id ?? null;

      if (giftCardId) {
        try {
          const activated = await prisma.$transaction(async (tx) => {
            const giftCard = await tx.giftCard.findUnique({
              where: { id: giftCardId },
              include: {
                studio: { select: { displayName: true } },
              },
            });
            if (!giftCard) return null;
            if (giftCard.activatedAt) return giftCard;

            return tx.giftCard.update({
              where: { id: giftCardId },
              data: {
                activatedAt: new Date(),
                stripePaymentIntentId,
                stripeCheckoutSessionId: session.id,
              },
              include: {
                studio: { select: { displayName: true } },
              },
            });
          });

          if (activated?.recipientEmail) {
            const origin = (process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
            const emailHtml = giftCardEmailCopy({
              recipientName: activated.recipientName,
              purchaserName: activated.purchaserName,
              studioName: activated.studio.displayName,
              code: activated.code,
              valueCents: activated.originalValueCents,
              validUntil: activated.validUntil,
              personalMessage: activated.personalMessage,
              balanceUrl: `${origin}/gift-cards/${encodeURIComponent(activated.code)}`,
            });

            await runStripeWebhookSideEffect(event.id, `gift_card_email:${activated.id}`, async () => {
              await sendGiftCardEmail({
                to: activated.recipientEmail!,
                subject: `Your gift card from ${activated.studio.displayName}`,
                html: emailHtml,
              });
              await prisma.giftCard.update({
                where: { id: activated.id },
                data: { sentAt: new Date() },
              });
            });
          }
        } catch (e) {
          logApiError("stripe_webhook_gift_card_purchase", e, { giftCardId }, req);
        }
      }
      return ack();
    }

    if (session.metadata?.type === "booking_remainder") {
      const bookingId = session.metadata.bookingId;
      const pi = session.payment_intent;
      const piId = typeof pi === "string" ? pi : pi?.id ?? null;
      if (bookingId) {
        const result = await prisma.$transaction((tx) =>
          settleBookingRemainderPayment(tx, {
            bookingId,
            provider: "stripe",
            providerPaymentId: piId,
            stripeCheckoutSessionId: session.id,
          }),
        );
        if (!result.ok) {
          logApiError("stripe_webhook_booking_remainder", new Error(result.error), { bookingId }, req);
        }
      }
      return ack();
    }

    if (session.metadata?.type === "class_package_purchase") {
      const packageId = session.metadata.packageId;
      const userId = session.metadata.userId;
      const startsAtRaw = session.metadata.startsAt;
      const paymentIntentRaw = session.payment_intent;
      const stripePaymentIntentId =
        typeof paymentIntentRaw === "string" ? paymentIntentRaw : paymentIntentRaw?.id ?? null;

      if (packageId && userId) {
        try {
          await prisma.$transaction(async (tx) => {
            if (stripePaymentIntentId) {
              const existing = await tx.classPackagePurchase.findFirst({
                where: { stripePaymentIntentId },
                select: { id: true },
              });
              if (existing) return;
            }
            const pkg = await tx.classPackage.findUnique({
              where: { id: packageId },
              include: { items: { select: { quantity: true } } },
            });
            if (!pkg || !pkg.isActive) return;
            if (pkg.maxSetsForSale != null && pkg.soldCount >= pkg.maxSetsForSale) return;

            const startsAt = startsAtRaw ? new Date(startsAtRaw) : new Date();
            const start = Number.isNaN(startsAt.getTime()) ? new Date() : startsAt;
            const expiresAt = new Date(start.getTime() + pkg.validityDays * 24 * 60 * 60 * 1000);
            const creditsTotal =
              pkg.generalItemLimit ?? pkg.items.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);

            await tx.classPackagePurchase.create({
              data: {
                packageId: pkg.id,
                userId,
                startsAt: start,
                expiresAt,
                creditsTotal,
                creditsUsed: 0,
                paidCents: pkg.priceCents,
                stripePaymentIntentId,
                status: "active",
              },
            });

            await tx.classPackage.update({
              where: { id: pkg.id },
              data: { soldCount: { increment: 1 } },
            });
          });
        } catch (e) {
          logApiError("stripe_webhook_class_package_purchase", e, { packageId, userId }, req);
        }
      }
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
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { totalCents: true },
      });
      if (!order) {
        return { skip: true, confirmedBookingIds: [] as string[], pendingApprovalIds: [] as string[], autoCancelledIds: [] as string[] };
      }
      const metaCouponId = session.metadata?.couponId ?? null;
      const metaDiscount = parseInt(session.metadata?.discountCents ?? "0", 10);
      const checkoutCartItemIds = session.metadata?.checkoutCartItemIds
        ?.split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      return settleCheckoutOrderPayment(tx, {
        orderId,
        currency: (session.currency || "eur").toUpperCase(),
        stripeAmountCents: session.amount_total ?? order.totalCents,
        stripePaymentId: piId,
        stripeCheckoutSessionId: session.id,
        couponRedemption:
          metaCouponId && !Number.isNaN(metaDiscount) && metaDiscount > 0
            ? { couponId: metaCouponId, amountCents: metaDiscount }
            : null,
        cartId: session.metadata?.cartId ?? null,
        checkoutCartItemIds,
      });
    });
    if (processed.skip) {
      return ack();
    }
    await runCheckoutCompletionSideEffects({
      orderId,
      confirmedBookingIds: processed.confirmedBookingIds,
      pendingApprovalIds: processed.pendingApprovalIds,
      autoCancelledIds: processed.autoCancelledIds,
      runSideEffect: (concern, fn) => runStripeWebhookSideEffect(event.id, concern, fn),
    });

    return ack();
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = typeof paymentIntent.metadata?.orderId === "string" ? paymentIntent.metadata.orderId : "";
    if (!orderId) return ack();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            vendor: { select: { displayName: true } },
          },
        },
      },
    });
    if (!order) return ack();

    if (order.paymentStatus === "pending") {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: "failed" },
      });
    }

    const studioName = order.items[0]?.vendor.displayName ?? "the studio";
    const customerHtml = orderPaymentFailedCopy({
      customerName: order.customerName || "there",
      orderId: order.id,
      studioName,
    });
    await runStripeWebhookSideEffect(event.id, `order_payment_failed_email:${order.id}`, async () => {
      await sendOrderEmails({
        customerEmail: order.customerEmail,
        subject: "Payment failed for your order",
        customerHtml,
      });
    });

    return ack();
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    await releaseGiftCardRedemptionsForSession(prisma, {
      stripeCheckoutSessionId: session.id,
    });

    if (session.metadata?.type === "booking_remainder" && session.metadata.bookingId) {
      await prisma.booking.updateMany({
        where: {
          id: session.metadata.bookingId,
          paymentStatus: { not: "paid" },
          remainingBalanceCents: { gt: 0 },
        },
        data: {
          remainderPaymentLink: null,
        },
      });
    }
    const orderId = typeof session.metadata?.orderId === "string" ? session.metadata.orderId : null;
    if (orderId) {
      await prisma.$transaction(async (tx) => {
        await tx.order.updateMany({
          where: { id: orderId, orderStatus: "pending", paymentStatus: "pending" },
          data: { orderStatus: "cancelled", paymentStatus: "failed" },
        });
        const orderItems = await tx.orderItem.findMany({
          where: { orderId, itemType: "booking", bookingId: { not: null } },
          select: { bookingId: true },
        });
        if (orderItems.length) {
          await tx.booking.updateMany({
            where: {
              id: { in: orderItems.map((item) => item.bookingId!).filter(Boolean) },
              bookingStatus: "pending",
              paymentStatus: "pending",
            },
            data: {
              bookingStatus: "cancelled_by_admin",
              notes: "Checkout session expired before payment confirmation.",
            },
          });
        }
      });
    }
    return ack();
  }

  return ack();
}
