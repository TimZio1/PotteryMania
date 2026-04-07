import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Claim a Stripe event for processing. If another worker already completed it, return true (caller should ACK without re-running).
 * If row exists but not processed, allow retry (Stripe redelivery after handler crash).
 */
export async function shouldSkipStripeWebhook(eventId: string): Promise<boolean> {
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { id: eventId },
    select: { processedAt: true },
  });
  if (existing?.processedAt) return true;
  return false;
}

export async function claimStripeWebhookEvent(
  eventId: string,
  eventType: string,
  payload?: Prisma.InputJsonValue,
): Promise<"duplicate_done" | "claimed"> {
  if (await shouldSkipStripeWebhook(eventId)) return "duplicate_done";
  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        id: eventId,
        eventType,
        ...(payload !== undefined ? { payload } : {}),
      },
    });
    return "claimed";
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      await prisma.stripeWebhookEvent.updateMany({
        where: { id: eventId, processedAt: null },
        data: { retryCount: { increment: 1 } },
      });
      if (await shouldSkipStripeWebhook(eventId)) return "duplicate_done";
      return "claimed";
    }
    throw e;
  }
}

export async function markStripeWebhookProcessed(eventId: string): Promise<void> {
  await prisma.stripeWebhookEvent.updateMany({
    where: { id: eventId, processedAt: null },
    data: { processedAt: new Date() },
  });
}
