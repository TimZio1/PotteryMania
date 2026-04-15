import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import {
  markActivationsEndedForStripeSubscription,
  syncStudioBillingSubscriptionFromStripe,
} from "@/lib/studio-feature-billing";
import {
  recordOfferingSubscriptionEvent,
  syncOfferingSubscriptionFromStripeSubscription,
} from "@/lib/offering-subscriptions";
import { getStripe } from "@/lib/stripe";

export async function handleCustomerSubscriptionDeleted(event: Stripe.Event): Promise<boolean> {
  if (event.type !== "customer.subscription.deleted") return false;
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
    return true;
  }
  await markActivationsEndedForStripeSubscription(sub.id);
  return true;
}

export async function handleCustomerSubscriptionUpdated(event: Stripe.Event): Promise<boolean> {
  if (event.type !== "customer.subscription.updated") return false;
  const sub = event.data.object as Stripe.Subscription;
  const row = await prisma.offeringSubscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
    select: { id: true },
  });
  if (row) {
    await syncOfferingSubscriptionFromStripeSubscription(sub);
    return true;
  }
  await syncStudioBillingSubscriptionFromStripe(sub);
  return true;
}

export async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<boolean> {
  if (event.type !== "invoice.payment_failed") return false;
  const invoice = event.data.object as Stripe.Invoice;
  const invoiceAny = invoice as unknown as { id?: string; subscription?: unknown };
  const subId =
    typeof invoiceAny.subscription === "string"
      ? invoiceAny.subscription
      : (invoiceAny.subscription as { id?: string } | null)?.id;
  if (!subId) return true;
  const row = await prisma.offeringSubscription.findUnique({ where: { stripeSubscriptionId: subId } });
  if (!row) return true;

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
        // Non-fatal; local status still marks cancel intent.
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
  return true;
}
