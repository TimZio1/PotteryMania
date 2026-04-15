import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeAdminStripeOrderRefund: vi.fn(),
  orderItemFindMany: vi.fn(),
}));

vi.mock("@/lib/orders/admin-stripe-order-refund", () => ({
  executeAdminStripeOrderRefund: (...args: unknown[]) => mocks.executeAdminStripeOrderRefund(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    orderItem: {
      findMany: (...args: unknown[]) => mocks.orderItemFindMany(...args),
    },
  },
}));

import { runCheckoutCompletionSideEffects } from "@/lib/orders/checkout-completion";

describe("runCheckoutCompletionSideEffects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeAdminStripeOrderRefund.mockResolvedValue({ ok: true });
    mocks.orderItemFindMany.mockResolvedValue([]);
  });

  it("attempts automatic Stripe refund when stock failure cancellation is flagged", async () => {
    await runCheckoutCompletionSideEffects({
      orderId: "order_1",
      confirmedBookingIds: [],
      pendingApprovalIds: [],
      autoCancelledIds: [],
      stockFailureCancelled: true,
    });

    expect(mocks.executeAdminStripeOrderRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order_1",
        adminUserId: "system:stock-failure",
      }),
    );
  });
});
