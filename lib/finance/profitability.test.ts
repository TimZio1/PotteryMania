import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeStreamProfitability, computeUserProfitability } from "./profitability";

const financeMocks = vi.hoisted(() => ({
  ledgerFindMany: vi.fn(),
  orderItemFindMany: vi.fn(),
  userFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    financeLedgerEntry: {
      findMany: (...args: unknown[]) => financeMocks.ledgerFindMany(...args),
    },
    orderItem: {
      findMany: (...args: unknown[]) => financeMocks.orderItemFindMany(...args),
    },
    user: {
      findMany: (...args: unknown[]) => financeMocks.userFindMany(...args),
    },
  },
}));

describe("finance profitability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    financeMocks.ledgerFindMany.mockReset();
    financeMocks.orderItemFindMany.mockReset();
    financeMocks.userFindMany.mockReset();
  });

  it("computes user profitability classifications from ledger", async () => {
    financeMocks.ledgerFindMany.mockResolvedValueOnce([
      { userId: "u1", entryType: "platform_commission", direction: "credit", amountCents: 3000 },
      { userId: "u1", entryType: "activation_fee", direction: "credit", amountCents: 1000 },
      { userId: "u1", entryType: "stripe_fee", direction: "debit", amountCents: 500 },
      { userId: "u2", entryType: "platform_commission", direction: "credit", amountCents: 1000 },
      { userId: "u2", entryType: "refund", direction: "debit", amountCents: 1300 },
    ]);
    financeMocks.userFindMany.mockResolvedValueOnce([
      { id: "u1", email: "u1@example.com" },
      { id: "u2", email: "u2@example.com" },
    ]);

    const rows = await computeUserProfitability(new Date("2026-04-01"), new Date("2026-04-30"));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      userId: "u1",
      revenueCents: 4000,
      costCents: 500,
      profitCents: 3500,
      classification: "high_profit",
    });
    expect(rows[1]).toMatchObject({
      userId: "u2",
      revenueCents: 1000,
      costCents: 1300,
      profitCents: -300,
      classification: "loss_making",
    });
  });

  it("splits commission stream by booking presence and allocates shared cost proportionally", async () => {
    financeMocks.ledgerFindMany.mockResolvedValueOnce([
      { entryType: "platform_commission", direction: "credit", amountCents: 1200, orderId: "ord_market" },
      { entryType: "platform_commission", direction: "credit", amountCents: 800, orderId: "ord_booking" },
      { entryType: "activation_fee", direction: "credit", amountCents: 400, orderId: null },
      { entryType: "stripe_fee", direction: "debit", amountCents: 500, orderId: null },
      { entryType: "refund", direction: "debit", amountCents: 100, orderId: null },
    ]);
    financeMocks.orderItemFindMany.mockResolvedValueOnce([
      { orderId: "ord_market", itemType: "product" },
      { orderId: "ord_booking", itemType: "booking" },
    ]);
    financeMocks.ledgerFindMany.mockResolvedValueOnce([
      { entryType: "gross_revenue", direction: "credit", amountCents: 2500, subscriptionId: "sub_1" },
      { entryType: "gross_revenue", direction: "debit", amountCents: 200, subscriptionId: "sub_1" },
    ]);

    const rows = await computeStreamProfitability(new Date("2026-04-01"), new Date("2026-04-30"));
    const byStream = new Map(rows.map((r) => [r.stream, r]));
    expect(byStream.get("activation_fee")).toMatchObject({ revenueCents: 400, profitCents: 400 });
    expect(byStream.get("marketplace_transactional")).toMatchObject({
      revenueCents: 1200,
      costAllocatedCents: 360,
      profitCents: 840,
    });
    expect(byStream.get("booking_transactional")).toMatchObject({
      revenueCents: 800,
      costAllocatedCents: 240,
      profitCents: 560,
    });
    expect(byStream.get("subscription")).toMatchObject({
      revenueCents: 2500,
      costAllocatedCents: 0,
      profitCents: 2500,
    });
  });
});
