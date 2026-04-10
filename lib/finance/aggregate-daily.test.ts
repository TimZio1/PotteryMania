import { beforeEach, describe, expect, it, vi } from "vitest";
import { aggregateFinancialSnapshotsForDate } from "./aggregate-daily";

const aggregateMocks = vi.hoisted(() => ({
  ledgerFindMany: vi.fn(),
  snapshotUpsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    financeLedgerEntry: {
      findMany: (...args: unknown[]) => aggregateMocks.ledgerFindMany(...args),
    },
    financialSnapshotDaily: {
      upsert: (...args: unknown[]) => aggregateMocks.snapshotUpsert(...args),
    },
  },
}));

describe("aggregateFinancialSnapshotsForDate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aggregateMocks.ledgerFindMany.mockReset();
    aggregateMocks.snapshotUpsert.mockReset();
    aggregateMocks.snapshotUpsert.mockResolvedValue(undefined);
  });

  it("computes platform and user snapshots with credit/debit manual adjustments", async () => {
    aggregateMocks.ledgerFindMany.mockResolvedValueOnce([
      { entryType: "gross_revenue", direction: "credit", amountCents: 5000, userId: "u1", entryDate: new Date("2026-04-10") },
      { entryType: "platform_commission", direction: "credit", amountCents: 1000, userId: "u1", entryDate: new Date("2026-04-10") },
      { entryType: "activation_fee", direction: "credit", amountCents: 500, userId: "u1", entryDate: new Date("2026-04-10") },
      { entryType: "stripe_fee", direction: "debit", amountCents: 120, userId: "u1", entryDate: new Date("2026-04-10") },
      { entryType: "manual_adjustment", direction: "debit", amountCents: 80, userId: "u1", entryDate: new Date("2026-04-10") },
      { entryType: "manual_adjustment", direction: "credit", amountCents: 30, userId: "u1", entryDate: new Date("2026-04-10") },
    ]);

    await aggregateFinancialSnapshotsForDate(new Date("2026-04-10T14:35:00.000Z"));

    expect(aggregateMocks.snapshotUpsert).toHaveBeenCalled();
    const platformCall = aggregateMocks.snapshotUpsert.mock.calls.find((call) => call[0]?.create?.scopeType === "platform");
    const userCall = aggregateMocks.snapshotUpsert.mock.calls.find((call) => call[0]?.create?.scopeType === "user");
    expect(platformCall?.[0]?.create).toMatchObject({
      revenueCents: 1500,
      costCents: 170,
      profitCents: 1330,
      marginBps: 8867,
    });
    expect(platformCall?.[0]?.create?.metrics).toMatchObject({
      gmvCents: 5000,
      platformRevenueCents: 1500,
    });
    expect(userCall?.[0]?.create).toMatchObject({
      scopeId: "u1",
      revenueCents: 6500,
      costCents: 120,
      profitCents: 6380,
    });
  });
});
