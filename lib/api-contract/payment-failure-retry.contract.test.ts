import { beforeEach, describe, expect, it, vi } from "vitest";

const dedupMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
}));

const completionMocks = vi.hoisted(() => ({
  executeAdminStripeOrderRefund: vi.fn(),
  orderItemFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    stripeWebhookEvent: {
      findUnique: (...a: unknown[]) => dedupMocks.findUnique(...a),
      create: (...a: unknown[]) => dedupMocks.create(...a),
      updateMany: (...a: unknown[]) => dedupMocks.updateMany(...a),
    },
    orderItem: {
      findMany: (...a: unknown[]) => completionMocks.orderItemFindMany(...a),
    },
  },
}));

vi.mock("@/lib/orders/admin-stripe-order-refund", () => ({
  executeAdminStripeOrderRefund: (...a: unknown[]) => completionMocks.executeAdminStripeOrderRefund(...a),
}));

vi.mock("@/lib/monitoring", () => ({ logApiError: () => {} }));

import {
  claimStripeWebhookEvent,
  markStripeWebhookProcessed,
} from "@/lib/stripe-webhook-dedup";

import { runCheckoutCompletionSideEffects } from "@/lib/orders/checkout-completion";

describe("payment failure / retry / duplicate — idempotency guarantees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("duplicate payment webhook defense", () => {
    it("blocks duplicate webhook that was already processed", async () => {
      dedupMocks.findUnique.mockResolvedValueOnce({ processedAt: new Date() });
      const result = await claimStripeWebhookEvent("evt_pay_1", "payment_intent.succeeded");
      expect(result).toBe("duplicate_done");
    });

    it("allows first claim of a new payment event", async () => {
      dedupMocks.findUnique.mockResolvedValueOnce(null);
      dedupMocks.create.mockResolvedValueOnce({ id: "evt_pay_new" });
      const result = await claimStripeWebhookEvent("evt_pay_new", "payment_intent.succeeded");
      expect(result).toBe("claimed");
      expect(dedupMocks.create).toHaveBeenCalledTimes(1);
    });

    it("handles concurrent duplicate by racing on create", async () => {
      const P2002Error = Object.assign(new Error("unique"), { code: "P2002" });
      Object.setPrototypeOf(P2002Error, (await import("@prisma/client")).Prisma.PrismaClientKnownRequestError.prototype);

      dedupMocks.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ processedAt: new Date() });
      dedupMocks.create.mockRejectedValueOnce(P2002Error);
      dedupMocks.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await claimStripeWebhookEvent("evt_race", "checkout.session.completed");
      expect(result).toBe("duplicate_done");
    });
  });

  describe("retry after initial claim", () => {
    it("re-claims event when previous attempt did not mark processed", async () => {
      const P2002Error = Object.assign(new Error("unique"), { code: "P2002" });
      Object.setPrototypeOf(P2002Error, (await import("@prisma/client")).Prisma.PrismaClientKnownRequestError.prototype);

      dedupMocks.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      dedupMocks.create.mockRejectedValueOnce(P2002Error);
      dedupMocks.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await claimStripeWebhookEvent("evt_retry", "checkout.session.completed");
      expect(result).toBe("claimed");
      expect(dedupMocks.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "evt_retry", processedAt: null },
        }),
      );
    });
  });

  describe("markStripeWebhookProcessed", () => {
    it("atomically marks event as processed", async () => {
      dedupMocks.updateMany.mockResolvedValueOnce({ count: 1 });
      await markStripeWebhookProcessed("evt_mark_done");
      expect(dedupMocks.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "evt_mark_done", processedAt: null },
        }),
      );
    });
  });
});

describe("runCheckoutCompletionSideEffects — stock failure auto-refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    completionMocks.executeAdminStripeOrderRefund.mockResolvedValue({ ok: true });
    completionMocks.orderItemFindMany.mockResolvedValue([]);
  });

  it("auto-refunds on stock failure", async () => {
    await runCheckoutCompletionSideEffects({
      orderId: "order_dup_1",
      confirmedBookingIds: [],
      pendingApprovalIds: [],
      autoCancelledIds: [],
      stockFailureCancelled: true,
    });
    expect(completionMocks.executeAdminStripeOrderRefund).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order_dup_1" }),
    );
  });
});
