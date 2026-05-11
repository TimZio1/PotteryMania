import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { recordStudioFeatureActivationEvent } from "@/lib/studio-feature-activation-events";
import { WEAR_EVENT_KINDS } from "@/lib/wear-event-kinds";
import { submitPaidWearOrderToSpreadconnect } from "@/lib/wear-order-spreadconnect";
import {
  claimStripeWebhookEvent,
  markStripeWebhookProcessed,
} from "@/lib/stripe-webhook-dedup";
import { isCheckoutSessionPaymentSuccessEvent } from "@/lib/stripe-checkout-session-events";
import { runStripeWebhookSideEffect } from "@/lib/webhook-event-store";
import { sendWearOrderNotification } from "@/lib/wear-order-notifications";
import { scheduleWearOrderOperatorAlert, sendWearOrderOperatorAlert } from "@/lib/wear-order-operator-alert";
import { logApiError } from "@/lib/monitoring";
import {
  mapStripeSubscriptionStatus,
  recordOfferingSubscriptionEvent,
} from "@/lib/offering-subscriptions";
import {
  handleCustomerSubscriptionDeleted,
  handleCustomerSubscriptionUpdated,
  handleInvoicePaymentFailed,
} from "@/lib/webhooks/stripe-subscription-events";
import { giftCardEmailCopy, sendGiftCardEmail } from "@/lib/gift-cards/email";
import { releaseGiftCardRedemptionsForSession } from "@/lib/gift-cards/checkout";
import { runCheckoutCompletionSideEffects, settleCheckoutOrderPayment } from "@/lib/orders/checkout-completion";
import { settleBookingRemainderPayment } from "@/lib/bookings/remainder";
import { orderPaymentFailedCopy, sendOrderEmails } from "@/lib/email/order-notify";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";
import {
  attemptWearAffiliatePayoutForStudio,
  recordWearAffiliateCommissionAndMaybePayout,
} from "@/lib/wear-affiliate-payouts";
import { sendWearAffiliateSaleEmail } from "@/lib/wear-affiliate-sale-email";
import { resolveCheckoutSessionBuyerIdentity } from "@/lib/stripe-checkout-buyer-identity";
import { applyWearOrderStripeRefund } from "@/lib/wear-order-refunds";
import { merchantFeedOfferId } from "@/lib/meta-wear-feed";
import { sendMetaConversionsPurchase } from "@/lib/meta-conversions-api";

/**
 * Payment + manual approval policy: Stripe success always reserves slot capacity (via safeReserveCapacity).
 * If experience.bookingApprovalRequired, booking becomes awaiting_vendor_approval until vendor approves → confirmed.
 * Reject (vendor) releases capacity; customer/vendor cancel via API attempts Stripe refund when policy allows (`stripe-refund-booking`).
 */

function stripeObjectId(value: string | { id?: string } | null | undefined): string | null {
  if (typeof value === "string") return value;
  return value?.id ?? null;
}

function chargeFromPaymentIntent(pi: Stripe.PaymentIntent): Stripe.Charge | null {
  const charge = pi.latest_charge;
  if (typeof charge !== "object" || charge === null) return null;
  if ("deleted" in charge && charge.deleted) return null;
  return charge as Stripe.Charge;
}

async function handleWearOrderRefundSideEffects(
  event: Stripe.Event,
  result: Awaited<ReturnType<typeof applyWearOrderStripeRefund>>,
): Promise<void> {
  if (!result.applied || !result.orderId) return;

  await runStripeWebhookSideEffect(event.id, `wear_order_refunded_email:${result.orderId}`, async () => {
    await sendWearOrderNotification("refunded", result.orderId!, {
      stripeEventType: event.type,
    });
  });
  await runStripeWebhookSideEffect(event.id, `wear_order_refunded_operator_alert:${result.orderId}`, async () => {
    await sendWearOrderOperatorAlert("refunded", result.orderId!, {
      stripeEventType: event.type,
    });
  });
}

async function handleWearOrderRefundEvent(event: Stripe.Event, req: Request): Promise<boolean> {
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = stripeObjectId(charge.payment_intent);
    if (!paymentIntentId) return true;

    const result = await applyWearOrderStripeRefund({
      paymentIntentId,
      stripeEventType: event.type,
      chargeId: charge.id,
      chargeAmountCents: charge.amount,
      amountRefundedCents: charge.amount_refunded ?? null,
      refundAmountCents: charge.amount_refunded ?? null,
    });
    await handleWearOrderRefundSideEffects(event, result);
    return true;
  }

  if (event.type === "charge.refund.updated" || event.type === "refund.created" || event.type === "refund.updated") {
    const refund = event.data.object as Stripe.Refund;
    if (refund.status && refund.status !== "succeeded") return true;

    const paymentIntentId = stripeObjectId(refund.payment_intent);
    if (!paymentIntentId) return true;

    let charge: Stripe.Charge | null = null;
    try {
      const pi = await getStripe().paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });
      charge = chargeFromPaymentIntent(pi);
    } catch (e) {
      logApiError("stripe_webhook_wear_refund_pi_lookup", e, { paymentIntentId, refundId: refund.id }, req);
    }

    const result = await applyWearOrderStripeRefund({
      paymentIntentId,
      stripeEventType: event.type,
      refundId: refund.id,
      refundStatus: refund.status ?? null,
      chargeId: stripeObjectId(refund.charge) ?? charge?.id ?? null,
      chargeAmountCents: charge?.amount ?? null,
      amountRefundedCents: charge?.amount_refunded ?? null,
      refundAmountCents: refund.amount ?? null,
    });
    await handleWearOrderRefundSideEffects(event, result);
    return true;
  }

  return false;
}

async function sendWearMetaPurchaseForOrder(input: {
  wearOrderId: string;
  eventId: string;
  eventSourcePath: "/wear/success" | "/checkout/success";
}): Promise<void> {
  const order = await prisma.wearOrder.findUnique({
    where: { id: input.wearOrderId },
    select: {
      id: true,
      customerEmail: true,
      currency: true,
      subtotalCents: true,
      shippingCents: true,
      amountTotalCents: true,
      items: {
        select: {
          wearProductId: true,
          wearProductVariantId: true,
          quantity: true,
        },
      },
    },
  });
  if (!order || order.items.length === 0) return;

  const contentIds = order.items.map((item) =>
    merchantFeedOfferId(item.wearProductId, item.wearProductVariantId),
  );
  const numItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCents = order.amountTotalCents ?? order.subtotalCents + order.shippingCents;
  const baseUrl = resolvePublicSiteUrl().replace(/\/+$/, "");

  await sendMetaConversionsPurchase({
    eventId: input.eventId,
    orderId: order.id,
    value: Number((Math.max(0, totalCents) / 100).toFixed(2)),
    currency: order.currency || "EUR",
    contentIds,
    numItems,
    email: order.customerEmail,
    eventSourceUrl: `${baseUrl}${input.eventSourcePath}`,
  });
}

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

  if (await handleCustomerSubscriptionDeleted(event)) return ack();
  if (await handleCustomerSubscriptionUpdated(event)) return ack();
  if (await handleInvoicePaymentFailed(event)) return ack();
  if (await handleWearOrderRefundEvent(event, req)) return ack();

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const row = await prisma.stripeAccount.findUnique({
      where: { stripeAccountId: account.id },
      select: { studioId: true },
    });
    if (!row) return ack();

    const updated = await prisma.stripeAccount.update({
      where: { studioId: row.studioId },
      data: {
        chargesEnabled: Boolean(account.charges_enabled),
        payoutsEnabled: Boolean(account.payouts_enabled),
        detailsSubmitted: Boolean(account.details_submitted),
        onboardingStatus:
          account.payouts_enabled && account.details_submitted
            ? "connected"
            : account.requirements?.disabled_reason
              ? "restricted"
              : "pending",
      },
    });
    if (updated.payoutsEnabled && updated.detailsSubmitted) {
      await runStripeWebhookSideEffect(event.id, `wear_affiliate_payout_ready:${row.studioId}`, async () => {
        await attemptWearAffiliatePayoutForStudio({ studioId: row.studioId, currency: "EUR" });
      });
    }
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

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (!isCheckoutSessionPaymentSuccessEvent(event.type, session.payment_status)) {
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
            const origin = resolvePublicSiteUrl();
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
                subject: `A gift card from ${activated.studio.displayName}`,
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
            const { email: sessionEmail, name: sessionName } = resolveCheckoutSessionBuyerIdentity(session);
            const backfillIdentity: { customerEmail?: string; customerName?: string } = {};
            if (sessionEmail && (!order.customerEmail || order.customerEmail.trim().length === 0)) {
              backfillIdentity.customerEmail = sessionEmail;
            }
            if (sessionName && (!order.customerName || order.customerName.trim().length === 0)) {
              backfillIdentity.customerName = sessionName;
            }
            await tx.wearOrder.update({
              where: { id: wearOrderId },
              data: {
                status: "paid",
                paidAt: order.paidAt ?? paidNow,
                stripeCheckoutSessionId: session.id,
                stripePaymentIntentId: piId,
                ...(amountTotal != null ? { amountTotalCents: amountTotal } : {}),
                ...backfillIdentity,
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

            const couponSnap = await tx.wearOrder.findUnique({
              where: { id: wearOrderId },
              select: { couponId: true, discountCents: true },
            });
            const couponDiscountCents = parseInt(session.metadata?.couponDiscountCents ?? "", 10);
            const couponRedemptionAmountCents = Number.isFinite(couponDiscountCents)
              ? couponDiscountCents
              : (couponSnap?.discountCents ?? 0);
            if (couponSnap?.couponId && couponRedemptionAmountCents > 0) {
              await tx.coupon.update({
                where: { id: couponSnap.couponId },
                data: { redeemedCount: { increment: 1 } },
              });
              await tx.discountRedemption.create({
                data: {
                  couponId: couponSnap.couponId,
                  wearOrderId,
                  amountCents: couponRedemptionAmountCents,
                },
              });
            }

            return true;
          });

          if (applied) {
            await runStripeWebhookSideEffect(event.id, `wear_meta_purchase:${wearOrderId}`, async () => {
              await sendWearMetaPurchaseForOrder({
                wearOrderId,
                eventId: session.id,
                eventSourcePath: "/wear/success",
              });
            });
            await runStripeWebhookSideEffect(event.id, `wear_order_confirmed_email:${wearOrderId}`, async () => {
              await sendWearOrderNotification("order_confirmed", wearOrderId);
            });
            await runStripeWebhookSideEffect(event.id, `wear_order_operator_alert:${wearOrderId}`, async () => {
              await sendWearOrderOperatorAlert("new_order", wearOrderId);
            });
            await runStripeWebhookSideEffect(event.id, `wear_affiliate_payout:${wearOrderId}`, async () => {
              await recordWearAffiliateCommissionAndMaybePayout(wearOrderId);
            });
            await runStripeWebhookSideEffect(event.id, `wear_affiliate_sale_email:${wearOrderId}`, async () => {
              const buyerId = resolveCheckoutSessionBuyerIdentity(session);
              await sendWearAffiliateSaleEmail({
                wearOrderId,
                buyerEmail: buyerId.email ?? session.customer_details?.email ?? null,
                buyerCountry: session.customer_details?.address?.country ?? null,
              });
            });
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
        return {
          skip: true,
          confirmedBookingIds: [] as string[],
          pendingApprovalIds: [] as string[],
          autoCancelledIds: [] as string[],
          stockFailureCancelled: false,
        };
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
        stripeTaxCents: session.total_details?.amount_tax ?? undefined,
        stripeTotalCents: session.amount_total ?? undefined,
        stripePaymentId: piId,
        stripeAccountId: session.metadata?.mixedCheckout === "true" ? null : event.account ?? null,
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
      stockFailureCancelled: processed.stockFailureCancelled,
      runSideEffect: (concern, fn) => runStripeWebhookSideEffect(event.id, concern, fn),
    });

    if (session.metadata?.mixedCheckout === "true") {
      const wearOrder = await prisma.wearOrder.findFirst({
        where: { orderId, status: "paid" },
        select: { id: true },
      });
      if (wearOrder) {
        await runStripeWebhookSideEffect(event.id, `mixed_wear_meta_purchase:${wearOrder.id}`, async () => {
          await sendWearMetaPurchaseForOrder({
            wearOrderId: wearOrder.id,
            eventId: session.id,
            eventSourcePath: "/checkout/success",
          });
        });
        await runStripeWebhookSideEffect(event.id, `mixed_wear_order_confirmed_email:${wearOrder.id}`, async () => {
          await sendWearOrderNotification("order_confirmed", wearOrder.id);
        });
        await runStripeWebhookSideEffect(event.id, `mixed_wear_order_operator_alert:${wearOrder.id}`, async () => {
          await sendWearOrderOperatorAlert("new_order", wearOrder.id);
        });
        await runStripeWebhookSideEffect(event.id, `mixed_wear_spreadconnect:${wearOrder.id}`, async () => {
          const fullSession = await getStripe().checkout.sessions.retrieve(session.id, {
            expand: ["shipping_cost.shipping_rate"],
          });
          await submitPaidWearOrderToSpreadconnect({
            wearOrderId: wearOrder.id,
            stripeSession: fullSession,
          });
        });
      }
    }

    return ack();
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const wearOrderId =
      paymentIntent.metadata?.type === "wear_order" && typeof paymentIntent.metadata?.wearOrderId === "string"
        ? paymentIntent.metadata.wearOrderId
        : "";
    if (wearOrderId) {
      try {
        const failureReason =
          paymentIntent.last_payment_error?.code ||
          paymentIntent.last_payment_error?.decline_code ||
          paymentIntent.last_payment_error?.message ||
          null;
        await runStripeWebhookSideEffect(event.id, `wear_order_payment_failed_alert:${wearOrderId}`, async () => {
          scheduleWearOrderOperatorAlert(
            "payment_failed",
            wearOrderId,
            failureReason ? { failureReason } : undefined,
          );
        });
      } catch (e) {
        logApiError("stripe_webhook_wear_payment_failed", e, { wearOrderId }, req);
      }
      return ack();
    }
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
        subject: "Your payment didn't go through",
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
