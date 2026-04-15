import { beforeEach, describe, expect, it, vi } from "vitest";

const refundMocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  paymentUpdate: vi.fn(),
  orderUpdate: vi.fn(),
  orderItemFindFirst: vi.fn(),
  stripeAccountFindUnique: vi.fn(),
  transaction: vi.fn(),
  piRetrieve: vi.fn(),
  refundCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    payment: { findFirst: refundMocks.findFirst, update: refundMocks.paymentUpdate },
    order: { findUnique: refundMocks.findUnique, update: refundMocks.orderUpdate },
    orderItem: { findFirst: refundMocks.orderItemFindFirst },
    stripeAccount: { findUnique: refundMocks.stripeAccountFindUnique },
    $transaction: refundMocks.transaction,
  },
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    paymentIntents: { retrieve: refundMocks.piRetrieve },
    refunds: { create: refundMocks.refundCreate },
  }),
}));

vi.mock("@/lib/finance/ledger", () => ({
  upsertLedgerEntry: vi.fn().mockResolvedValue(undefined),
}));

import { executeAdminStripeOrderRefund, getStripeOrderRefundSnapshot } from "./admin-stripe-order-refund";

const orderId = "00000000-0000-0000-0000-000000000001";
const payId = "11111111-1111-1111-1111-111111111111";
const piId = "pi_test_123";

function wirePi(received: number, refunded: number) {
  refundMocks.piRetrieve.mockResolvedValue({
    latest_charge: { amount: received, amount_refunded: refunded },
  });
}

describe("getStripeOrderRefundSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refundMocks.orderItemFindFirst.mockResolvedValue({ vendorId: "studio-1" });
    refundMocks.stripeAccountFindUnique.mockResolvedValue({ stripeAccountId: "acct_test_123" });
  });

  it("returns error when no Stripe payment exists", async () => {
    refundMocks.findFirst.mockResolvedValue(null);
    const r = await getStripeOrderRefundSnapshot(orderId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/No succeeded Stripe payment/i);
  });

  it("returns refundable cents from charge", async () => {
    refundMocks.findFirst.mockResolvedValue({
      id: payId,
      providerPaymentId: piId,
      currency: "eur",
      paymentStatus: "succeeded",
    });
    wirePi(10_000, 3_000);
    const r = await getStripeOrderRefundSnapshot(orderId);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.refundableCents).toBe(7_000);
      expect(r.amountReceivedCents).toBe(10_000);
    }
  });
});

describe("executeAdminStripeOrderRefund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refundMocks.orderItemFindFirst.mockResolvedValue({ vendorId: "studio-1" });
    refundMocks.stripeAccountFindUnique.mockResolvedValue({ stripeAccountId: "acct_test_123" });
    refundMocks.findFirst.mockResolvedValue({
      id: payId,
      orderId,
      providerPaymentId: piId,
      currency: "eur",
      paymentStatus: "succeeded",
    });
    wirePi(10_000, 0);
    refundMocks.findUnique.mockResolvedValue({
      customerUserId: null,
      currency: "EUR",
      shippingAddressJson: null,
    });
    refundMocks.refundCreate.mockResolvedValue({ id: "re_abc", created: 1_700_000_000 });
    refundMocks.paymentUpdate.mockResolvedValue({});
    refundMocks.orderUpdate.mockResolvedValue({});
    refundMocks.transaction.mockImplementation((ops: unknown[]) => Promise.all(ops as Promise<unknown>[]));
  });

  it("rejects short reason", async () => {
    const r = await executeAdminStripeOrderRefund({
      orderId,
      adminUserId: "adm",
      reason: "no",
    });
    expect(r.ok).toBe(false);
    expect(refundMocks.refundCreate).not.toHaveBeenCalled();
  });

  it("returns error when nothing refundable", async () => {
    wirePi(10_000, 10_000);
    const r = await executeAdminStripeOrderRefund({
      orderId,
      adminUserId: "adm",
      reason: "full refund",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Nothing left/i);
  });

  it("full refund uses reverse_transfer and refund_application_fee (Connect)", async () => {
    const r = await executeAdminStripeOrderRefund({
      orderId,
      adminUserId: "adm1",
      reason: "Customer requested",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.amountCents).toBe(10_000);
    expect(r.fullyRefunded).toBe(true);
    expect(refundMocks.refundCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: piId,
        amount: 10_000,
        reverse_transfer: true,
        refund_application_fee: true,
      }),
      expect.objectContaining({ stripeAccount: "acct_test_123" }),
    );
    expect(refundMocks.paymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentStatus: "refunded" }) }),
    );
    expect(refundMocks.orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentStatus: "refunded",
          orderStatus: "refunded",
        }),
      }),
    );
  });

  it("partial refund then remainder; third call fails when Stripe balance is exhausted", async () => {
    const r1 = await executeAdminStripeOrderRefund({
      orderId,
      adminUserId: "adm1",
      reason: "Partial goodwill",
      amountCents: 4_000,
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.amountCents).toBe(4_000);
    expect(r1.fullyRefunded).toBe(false);
    expect(refundMocks.orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentStatus: "partially_refunded",
          orderStatus: "partially_refunded",
        }),
      }),
    );

    wirePi(10_000, 4_000);
    const r2 = await executeAdminStripeOrderRefund({
      orderId,
      adminUserId: "adm1",
      reason: "Rest of balance",
      amountCents: 6_000,
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.amountCents).toBe(6_000);

    wirePi(10_000, 10_000);
    const r3 = await executeAdminStripeOrderRefund({
      orderId,
      adminUserId: "adm1",
      reason: "Over-refund attempt",
    });
    expect(r3.ok).toBe(false);
    expect(refundMocks.refundCreate).toHaveBeenCalledTimes(2);
  });

  it("caps requested amount to remaining refundable balance", async () => {
    wirePi(10_000, 9_000);
    const r = await executeAdminStripeOrderRefund({
      orderId,
      adminUserId: "adm1",
      reason: "cap test",
      amountCents: 5_000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.amountCents).toBe(1_000);
    expect(r.fullyRefunded).toBe(true);
    expect(refundMocks.refundCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1_000 }),
      expect.objectContaining({ stripeAccount: "acct_test_123" }),
    );
  });

  it("rejects non-positive refund amount", async () => {
    const r = await executeAdminStripeOrderRefund({
      orderId,
      adminUserId: "adm1",
      reason: "invalid amount",
      amountCents: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/at least 1 cent/i);
    expect(refundMocks.refundCreate).not.toHaveBeenCalled();
  });

  it("maps Stripe refund errors", async () => {
    refundMocks.refundCreate.mockRejectedValue(new Error("card declined"));
    const r = await executeAdminStripeOrderRefund({
      orderId,
      adminUserId: "adm1",
      reason: "Refund test",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/card declined/i);
  });
});
