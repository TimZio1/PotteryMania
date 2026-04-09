import { beforeEach, describe, expect, it, vi } from "vitest";
import { upsertLedgerEntry } from "./ledger";

const ledgerMocks = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    financeLedgerEntry: {
      create: (...args: unknown[]) => ledgerMocks.create(...args),
    },
  },
}));

describe("finance ledger upsert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ledgerMocks.create.mockReset();
  });

  it("writes normalized ledger row with absolute amount and default currency", async () => {
    ledgerMocks.create.mockResolvedValueOnce({ id: "le_1" });
    await upsertLedgerEntry({
      entryDate: new Date("2026-04-09T00:00:00.000Z"),
      entryType: "refund",
      amountCents: -1250,
      direction: "debit",
      sourceSystem: "stripe",
      sourceType: "stripe_refund",
      dedupeKey: "stripe_refund:rf_1",
      orderId: "ord_1",
    });
    const payload = ledgerMocks.create.mock.calls[0]?.[0] as {
      data: { amountCents: number; currency: string; dedupeKey: string; orderId: string | null };
    };
    expect(payload.data.amountCents).toBe(1250);
    expect(payload.data.currency).toBe("EUR");
    expect(payload.data.dedupeKey).toBe("stripe_refund:rf_1");
    expect(payload.data.orderId).toBe("ord_1");
  });

  it("is idempotent on duplicate dedupe key (P2002)", async () => {
    ledgerMocks.create.mockRejectedValueOnce({ code: "P2002" });
    await expect(
      upsertLedgerEntry({
        entryDate: new Date("2026-04-09T00:00:00.000Z"),
        entryType: "refund",
        amountCents: 500,
        direction: "debit",
        sourceSystem: "stripe",
        sourceType: "stripe_refund",
        dedupeKey: "stripe_refund:rf_dup",
      }),
    ).resolves.toBeUndefined();
  });

  it("rethrows non-duplicate persistence errors", async () => {
    ledgerMocks.create.mockRejectedValueOnce(new Error("db unavailable"));
    await expect(
      upsertLedgerEntry({
        entryDate: new Date("2026-04-09T00:00:00.000Z"),
        entryType: "refund",
        amountCents: 500,
        direction: "debit",
        sourceSystem: "stripe",
        sourceType: "stripe_refund",
        dedupeKey: "stripe_refund:rf_err",
      }),
    ).rejects.toThrow(/db unavailable/i);
  });
});
