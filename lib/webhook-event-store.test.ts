import { beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  taskCreate: vi.fn(),
  webhookUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    stripeWebhookEventTask: {
      create: (...args: unknown[]) => storeMocks.taskCreate(...args),
    },
    stripeWebhookEvent: {
      update: (...args: unknown[]) => storeMocks.webhookUpdate(...args),
    },
    $transaction: (...args: unknown[]) => storeMocks.transaction(...args),
  },
}));

import { recordStripeWebhookTaskFailure, runStripeWebhookSideEffect } from "@/lib/webhook-event-store";

describe("webhook event store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.taskCreate.mockReset();
    storeMocks.webhookUpdate.mockReset();
    storeMocks.transaction.mockReset();
    storeMocks.taskCreate.mockResolvedValue({ id: "task_1" });
    storeMocks.webhookUpdate.mockResolvedValue({ id: "evt_1" });
    storeMocks.transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]));
  });

  it("records task failure with truncated reason", async () => {
    const longReason = "x".repeat(9000);
    await recordStripeWebhookTaskFailure("evt_1", "calendar_sync", longReason);
    expect(storeMocks.taskCreate).toHaveBeenCalledTimes(1);
    const payload = storeMocks.taskCreate.mock.calls[0]?.[0] as {
      data: { failureReason: string; stripeWebhookEventId: string; concern: string };
    };
    expect(payload.data.stripeWebhookEventId).toBe("evt_1");
    expect(payload.data.concern).toBe("calendar_sync");
    expect(payload.data.failureReason).toHaveLength(8000);
    expect(storeMocks.webhookUpdate).toHaveBeenCalledTimes(1);
  });

  it("executes side effect without recording failure when successful", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    await runStripeWebhookSideEffect("evt_ok", "email_send", fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(storeMocks.taskCreate).not.toHaveBeenCalled();
  });

  it("records failure when side effect throws", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("smtp down"));
    await runStripeWebhookSideEffect("evt_fail", "email_send", fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(storeMocks.taskCreate).toHaveBeenCalledTimes(1);
    const payload = storeMocks.taskCreate.mock.calls[0]?.[0] as {
      data: { stripeWebhookEventId: string; concern: string; failureReason: string };
    };
    expect(payload.data.stripeWebhookEventId).toBe("evt_fail");
    expect(payload.data.concern).toBe("email_send");
    expect(payload.data.failureReason).toContain("smtp down");
  });
});
