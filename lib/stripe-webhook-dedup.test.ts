import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const dedupMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    stripeWebhookEvent: {
      findUnique: (...args: unknown[]) => dedupMocks.findUnique(...args),
      create: (...args: unknown[]) => dedupMocks.create(...args),
      updateMany: (...args: unknown[]) => dedupMocks.updateMany(...args),
    },
  },
}));

import {
  claimStripeWebhookEvent,
  markStripeWebhookProcessed,
  shouldSkipStripeWebhook,
} from "@/lib/stripe-webhook-dedup";

function asKnownRequestError(code: string): Prisma.PrismaClientKnownRequestError {
  const err = new Error("mock prisma known request error") as Prisma.PrismaClientKnownRequestError & {
    code: string;
  };
  err.code = code;
  Object.setPrototypeOf(err, Prisma.PrismaClientKnownRequestError.prototype);
  return err;
}

describe("stripe webhook idempotency helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dedupMocks.findUnique.mockReset();
    dedupMocks.create.mockReset();
    dedupMocks.updateMany.mockReset();
  });

  it("skips when event already marked processed", async () => {
    dedupMocks.findUnique.mockResolvedValueOnce({ processedAt: new Date() });
    await expect(shouldSkipStripeWebhook("evt_done")).resolves.toBe(true);
  });

  it("claims fresh event when no prior row exists", async () => {
    dedupMocks.findUnique.mockResolvedValueOnce(null);
    dedupMocks.create.mockResolvedValueOnce({ id: "evt_new" });
    await expect(claimStripeWebhookEvent("evt_new", "checkout.session.completed")).resolves.toBe("claimed");
    expect(dedupMocks.create).toHaveBeenCalledTimes(1);
  });

  it("returns duplicate_done for already processed event", async () => {
    dedupMocks.findUnique.mockResolvedValueOnce({ processedAt: new Date() });
    await expect(claimStripeWebhookEvent("evt_dup", "checkout.session.completed")).resolves.toBe("duplicate_done");
    expect(dedupMocks.create).not.toHaveBeenCalled();
  });

  it("handles create conflict by incrementing retry and continuing when still unprocessed", async () => {
    dedupMocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    dedupMocks.create.mockRejectedValueOnce(asKnownRequestError("P2002"));
    dedupMocks.updateMany.mockResolvedValueOnce({ count: 1 });
    await expect(claimStripeWebhookEvent("evt_retry", "checkout.session.completed")).resolves.toBe("claimed");
    expect(dedupMocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt_retry", processedAt: null },
      }),
    );
  });

  it("handles create conflict by returning duplicate_done when event became processed", async () => {
    dedupMocks.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ processedAt: new Date() });
    dedupMocks.create.mockRejectedValueOnce(asKnownRequestError("P2002"));
    dedupMocks.updateMany.mockResolvedValueOnce({ count: 1 });
    await expect(claimStripeWebhookEvent("evt_retry_done", "checkout.session.completed")).resolves.toBe(
      "duplicate_done",
    );
  });

  it("marks unprocessed events as processed", async () => {
    dedupMocks.updateMany.mockResolvedValueOnce({ count: 1 });
    await markStripeWebhookProcessed("evt_mark");
    expect(dedupMocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt_mark", processedAt: null },
      }),
    );
  });
});
