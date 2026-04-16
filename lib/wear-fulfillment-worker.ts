import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getSpreadconnectConfig } from "@/lib/spreadconnect-config";
import { isRuntimeFlagEnabled, RUNTIME_FLAG_KEYS } from "@/lib/runtime-feature-flags";
import { submitPaidWearOrderToSpreadconnect } from "@/lib/wear-order-spreadconnect";

const SUBMITTED_KIND = "wear_spreadconnect_submitted";
const FAILED_KIND = "wear_spreadconnect_failed";

const LOCK_ID = "cron:wear-fulfillment";

function nextDelayMs(attemptNo: number): number {
  const base = 60_000;
  const cap = 30 * 60_000;
  return Math.min(cap, base * 2 ** Math.min(attemptNo - 1, 8));
}

export type WearFulfillmentWorkerResult = {
  claimed: number;
  succeeded: number;
  rescheduled: number;
  failed: number;
};

/**
 * Picks pending Spreadconnect submit jobs and attempts submission when runtime + env gates pass.
 */
export async function runWearFulfillmentJobsOnce(limit: number): Promise<WearFulfillmentWorkerResult> {
  const now = new Date();
  const result: WearFulfillmentWorkerResult = {
    claimed: 0,
    succeeded: 0,
    rescheduled: 0,
    failed: 0,
  };

  const jobs = await prisma.wearFulfillmentJob.findMany({
    where: {
      jobKind: "spreadconnect_submit",
      status: "pending",
      runAfter: { lte: now },
    },
    orderBy: { runAfter: "asc" },
    take: limit,
  });

  for (const job of jobs) {
    const claimed = await prisma.wearFulfillmentJob.updateMany({
      where: { id: job.id, status: "pending" },
      data: {
        status: "processing",
        lockedBy: LOCK_ID,
        lockedAt: now,
        startedAt: job.startedAt ?? now,
        attemptCount: { increment: 1 },
      },
    });
    if (claimed.count === 0) continue;
    result.claimed += 1;

    /** Attempt number after this claim (DB incremented). */
    const attemptNo = job.attemptCount + 1;

    const order = await prisma.wearOrder.findUnique({
      where: { id: job.wearOrderId },
      select: {
        id: true,
        status: true,
        stripeCheckoutSessionId: true,
        externalFulfillmentRef: true,
      },
    });

    if (!order || order.status !== "paid") {
      await finishJob(job.id, "failed", `Order missing or not paid (status=${order?.status ?? "null"})`);
      result.failed += 1;
      continue;
    }

    if (order.externalFulfillmentRef?.startsWith("sc:")) {
      await finishJob(job.id, "succeeded", null);
      result.succeeded += 1;
      continue;
    }

    const dup = await prisma.wearAnalyticsEvent.findFirst({
      where: { orderId: order.id, kind: SUBMITTED_KIND },
    });
    if (dup) {
      await finishJob(job.id, "succeeded", null);
      result.succeeded += 1;
      continue;
    }

    const fulfillmentEnabled = await isRuntimeFlagEnabled(RUNTIME_FLAG_KEYS.wearFulfillmentEnabled, true);
    if (!fulfillmentEnabled) {
      await rescheduleJob(job.id, attemptNo, job.maxAttempts, "wear_fulfillment_enabled is off");
      result.rescheduled += 1;
      continue;
    }

    const cfg = getSpreadconnectConfig();
    if (!cfg || !cfg.liveSubmissionAllowed) {
      await rescheduleJob(
        job.id,
        attemptNo,
        job.maxAttempts,
        cfg
          ? `live submission disabled (supplierEnvironment=${cfg.supplierEnvironment})`
          : "Spreadconnect not configured",
      );
      result.rescheduled += 1;
      continue;
    }

    if (!order.stripeCheckoutSessionId) {
      await finishJob(job.id, "failed", "Missing stripeCheckoutSessionId");
      result.failed += 1;
      continue;
    }

    const attemptStartedAt = new Date();

    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId, {
        expand: ["shipping_cost.shipping_rate"],
      });
      await submitPaidWearOrderToSpreadconnect({ wearOrderId: order.id, stripeSession: session });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "stripe or submit failed";
      await rescheduleJob(job.id, attemptNo, job.maxAttempts, msg);
      result.rescheduled += 1;
      continue;
    }

    const afterOrder = await prisma.wearOrder.findUnique({
      where: { id: order.id },
      select: { externalFulfillmentRef: true },
    });
    if (afterOrder?.externalFulfillmentRef?.startsWith("sc:")) {
      await finishJob(job.id, "succeeded", null);
      result.succeeded += 1;
      continue;
    }

    const newFail = await prisma.wearAnalyticsEvent.findFirst({
      where: {
        orderId: order.id,
        kind: FAILED_KIND,
        createdAt: { gte: attemptStartedAt },
      },
      orderBy: { createdAt: "desc" },
    });

    if (newFail) {
      const payload = newFail.payload as { message?: string; reason?: string } | null;
      const errMsg =
        (typeof payload?.message === "string" && payload.message) ||
        (typeof payload?.reason === "string" && payload.reason) ||
        "Spreadconnect reported failure";
      if (attemptNo >= job.maxAttempts) {
        await finishJob(job.id, "failed", errMsg);
        result.failed += 1;
      } else {
        await rescheduleJob(job.id, attemptNo, job.maxAttempts, errMsg);
        result.rescheduled += 1;
      }
      continue;
    }

    if (attemptNo >= job.maxAttempts) {
      await finishJob(job.id, "failed", "Submit finished without success or recorded failure");
      result.failed += 1;
    } else {
      await rescheduleJob(job.id, attemptNo, job.maxAttempts, "Submit completed without confirmation; retrying");
      result.rescheduled += 1;
    }
  }

  return result;
}

async function finishJob(jobId: string, status: "succeeded" | "failed", lastError: string | null) {
  const end = new Date();
  await prisma.wearFulfillmentJob.update({
    where: { id: jobId },
    data: {
      status,
      finishedAt: end,
      lastError,
      lockedBy: null,
      lockedAt: null,
    },
  });
}

async function rescheduleJob(jobId: string, attemptNo: number, maxAttempts: number, lastError: string) {
  if (attemptNo >= maxAttempts) {
    await finishJob(jobId, "failed", lastError);
    return;
  }
  const next = new Date(Date.now() + nextDelayMs(attemptNo));
  await prisma.wearFulfillmentJob.update({
    where: { id: jobId },
    data: {
      status: "pending",
      runAfter: next,
      lastError: lastError.slice(0, 4000),
      lockedBy: null,
      lockedAt: null,
    },
  });
}
