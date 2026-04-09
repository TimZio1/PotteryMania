import type Stripe from "stripe";
import { prisma } from "@/lib/db";

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): "active" | "trialing" | "past_due" | "paused" | "canceled" | "expired" {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "past_due";
  if (status === "paused") return "paused";
  if (status === "incomplete_expired") return "expired";
  return "canceled";
}

export async function recordOfferingSubscriptionEvent(
  subscriptionId: string,
  eventType:
    | "created"
    | "checkout_completed"
    | "renewed"
    | "payment_failed"
    | "payment_recovered"
    | "paused"
    | "resumed"
    | "cancel_scheduled"
    | "canceled"
    | "expired"
    | "plan_changed",
  payload?: object,
) {
  await prisma.offeringSubscriptionEvent.create({
    data: {
      subscriptionId,
      eventType,
      ...(payload ? { payload } : {}),
    },
  });
}

export async function syncOfferingSubscriptionFromStripeSubscription(sub: Stripe.Subscription) {
  const row = await prisma.offeringSubscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
  });
  if (!row) return;
  const subAny = sub as unknown as {
    status?: Stripe.Subscription.Status;
    current_period_start?: number;
    current_period_end?: number;
    cancel_at_period_end?: boolean;
    trial_end?: number | null;
  };
  const mapped = mapStripeSubscriptionStatus(subAny.status ?? "active");
  const currentPeriodStart = subAny.current_period_start ? new Date(subAny.current_period_start * 1000) : null;
  const currentPeriodEnd = subAny.current_period_end ? new Date(subAny.current_period_end * 1000) : null;
  const nextBillingDate = currentPeriodEnd;
  const cancelAtPeriodEnd = Boolean(subAny.cancel_at_period_end);
  const trialEndsAt = subAny.trial_end ? new Date(subAny.trial_end * 1000) : null;

  await prisma.offeringSubscription.update({
    where: { id: row.id },
    data: {
      status: cancelAtPeriodEnd && (mapped === "active" || mapped === "trialing") ? "pending_cancel" : mapped,
      currentPeriodStart: currentPeriodStart ?? undefined,
      currentPeriodEnd: currentPeriodEnd ?? undefined,
      nextBillingDate,
      cancelAtPeriodEnd,
      trialEndsAt,
      autoRenew: !cancelAtPeriodEnd,
      endedAt: mapped === "canceled" || mapped === "expired" ? new Date() : null,
    },
  });
}
