import { prisma } from "@/lib/db";

/**
 * Record a non-fatal webhook side-effect failure (email, calendar, etc.) for ops visibility.
 */
export async function recordStripeWebhookTaskFailure(
  eventId: string,
  concern: string,
  reason: string,
): Promise<void> {
  const msg = reason.slice(0, 8000);
  try {
    await prisma.$transaction([
      prisma.stripeWebhookEventTask.create({
        data: {
          stripeWebhookEventId: eventId,
          concern,
          failedAt: new Date(),
          failureReason: msg,
        },
      }),
      prisma.stripeWebhookEvent.update({
        where: { id: eventId },
        data: { failedAt: new Date() },
      }),
    ]);
  } catch (e) {
    console.error("[webhook-event-store] record failure", eventId, concern, e);
  }
}

export async function runStripeWebhookSideEffect(
  eventId: string,
  concern: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[stripe webhook] side effect ${concern}`, e);
    await recordStripeWebhookTaskFailure(eventId, concern, msg);
  }
}
