import { beforeEach, describe, expect, it, vi } from "vitest";

const refundMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRawUnsafe: vi.fn(),
  wearOrderUpdate: vi.fn(),
  wearOrderEventCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: refundMocks.transaction,
  },
}));

import { applyWearOrderStripeRefund } from "@/lib/wear-order-refunds";

const orderId = "1ac738b3-ac7d-45fb-8736-af1ab9046ef2";
const paymentIntentId = "pi_3TVydbEfeKBuQV5G1A26TLNP";

function wireTransaction() {
  const tx = {
    $queryRawUnsafe: refundMocks.queryRawUnsafe,
    wearOrder: { update: refundMocks.wearOrderUpdate },
    wearOrderEvent: { create: refundMocks.wearOrderEventCreate },
  };
  refundMocks.transaction.mockImplementation((fn: (txArg: typeof tx) => Promise<unknown>) => fn(tx));
}

describe("applyWearOrderStripeRefund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
    refundMocks.wearOrderEventCreate.mockResolvedValue({});
    refundMocks.wearOrderUpdate.mockResolvedValue({});
  });

  it("marks a matching wear order refunded when Stripe reports the full charge refunded", async () => {
    refundMocks.queryRawUnsafe.mockResolvedValue([{ id: orderId, status: "paid", refunded_at: null }]);

    const result = await applyWearOrderStripeRefund({
      paymentIntentId,
      stripeEventType: "charge.refunded",
      chargeId: "ch_123",
      chargeAmountCents: 10_000,
      amountRefundedCents: 10_000,
    });

    expect(result).toMatchObject({
      matched: true,
      applied: true,
      fullyRefunded: true,
      orderId,
      previousStatus: "paid",
    });
    expect(refundMocks.wearOrderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: orderId },
        data: expect.objectContaining({
          status: "refunded",
          refundedAt: expect.any(Date),
        }),
      }),
    );
    expect(refundMocks.wearOrderEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId,
          eventType: "stripe_refund_succeeded",
          eventSource: "stripe",
        }),
      }),
    );
  });

  it("records partial refund visibility without closing the wear order", async () => {
    refundMocks.queryRawUnsafe.mockResolvedValue([{ id: orderId, status: "paid", refunded_at: null }]);

    const result = await applyWearOrderStripeRefund({
      paymentIntentId,
      stripeEventType: "refund.updated",
      refundId: "re_123",
      refundStatus: "succeeded",
      chargeAmountCents: 10_000,
      amountRefundedCents: 4_000,
      refundAmountCents: 4_000,
    });

    expect(result).toMatchObject({
      matched: true,
      applied: false,
      fullyRefunded: false,
      orderId,
      reason: "not_fully_refunded",
    });
    expect(refundMocks.wearOrderUpdate).not.toHaveBeenCalled();
    expect(refundMocks.wearOrderEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId,
          eventType: "stripe_refund_seen",
        }),
      }),
    );
  });

  it("does not reapply notifications when the order is already refunded", async () => {
    refundMocks.queryRawUnsafe.mockResolvedValue([
      { id: orderId, status: "refunded", refunded_at: new Date("2026-05-11T12:00:00.000Z") },
    ]);

    const result = await applyWearOrderStripeRefund({
      paymentIntentId,
      stripeEventType: "charge.refunded",
      chargeAmountCents: 10_000,
      amountRefundedCents: 10_000,
    });

    expect(result).toMatchObject({
      matched: true,
      applied: false,
      fullyRefunded: true,
      orderId,
      reason: "already_refunded",
    });
    expect(refundMocks.wearOrderUpdate).not.toHaveBeenCalled();
  });
});
