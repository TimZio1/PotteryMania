import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const JOB_KIND = "spreadconnect_submit";

export type DeferSpreadconnectReason = "fulfillment_disabled" | "live_submission_disabled";

/**
 * When live submission cannot run yet, persist a pending job (idempotent) and an order event
 * so cron or a later deploy can submit once gates allow.
 */
export async function ensureSpreadconnectSubmitDeferred(opts: {
  wearOrderId: string;
  reason: DeferSpreadconnectReason;
  detail: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const existing = await prisma.wearFulfillmentJob.findFirst({
    where: {
      wearOrderId: opts.wearOrderId,
      jobKind: JOB_KIND,
      status: { in: ["pending", "processing"] },
    },
  });
  if (!existing) {
    const payloadJson: Prisma.InputJsonValue = {
      reason: opts.reason,
      ...(opts.payload ?? {}),
    };
    await prisma.wearFulfillmentJob.create({
      data: {
        wearOrderId: opts.wearOrderId,
        jobKind: JOB_KIND,
        status: "pending",
        runAfter: new Date(),
        payload: payloadJson,
      },
    });
    await prisma.wearOrderEvent.create({
      data: {
        orderId: opts.wearOrderId,
        eventType: opts.reason === "fulfillment_disabled" ? "fulfillment_deferred" : "spreadconnect_deferred",
        eventSource: "spreadconnect_gate",
        message: opts.detail,
        payload: (opts.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
    await prisma.wearOrder.update({
      where: { id: opts.wearOrderId },
      data: {
        fulfillmentStatusDetail: opts.detail.slice(0, 1000),
        fulfillmentLastAttemptAt: new Date(),
      },
    });
  }
}
