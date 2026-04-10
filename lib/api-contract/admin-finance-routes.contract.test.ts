import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const financeRouteMocks = vi.hoisted(() => ({
  requireFinanceAdmin: vi.fn(),
  upsertLedgerEntry: vi.fn(),
  logAdminAction: vi.fn(),
  runPricingSimulation: vi.fn(),
}));

vi.mock("@/lib/finance/admin-guard", () => ({
  requireFinanceAdmin: financeRouteMocks.requireFinanceAdmin,
}));

vi.mock("@/lib/finance/ledger", () => ({
  upsertLedgerEntry: financeRouteMocks.upsertLedgerEntry,
}));

vi.mock("@/lib/admin-audit", () => ({
  logAdminAction: financeRouteMocks.logAdminAction,
}));

vi.mock("@/lib/finance/simulate", () => ({
  runPricingSimulation: financeRouteMocks.runPricingSimulation,
}));

import { POST as postLedgerAdjustment } from "@/app/api/admin/finance/ledger-adjustment/route";
import { POST as postFinanceScenario } from "@/app/api/admin/finance/scenarios/route";

describe("API contract: admin finance routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    financeRouteMocks.requireFinanceAdmin.mockResolvedValue({
      ok: true,
      user: {
        id: "u-admin",
        email: "admin@example.com",
        role: "admin",
      },
    });
    financeRouteMocks.upsertLedgerEntry.mockResolvedValue(undefined);
    financeRouteMocks.logAdminAction.mockResolvedValue(undefined);
    financeRouteMocks.runPricingSimulation.mockResolvedValue({
      id: "sim_1",
      outputs: { grossRevenueCents: 100_000 },
    });
  });

  it("returns guard response when finance-admin auth fails (ledger route)", async () => {
    financeRouteMocks.requireFinanceAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const req = new Request("http://localhost:3000/api/admin/finance/ledger-adjustment", {
      method: "POST",
      body: "{}",
    });
    const res = await postLedgerAdjustment(req);
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  it("returns 400 for disallowed manual ledger entry type", async () => {
    const req = new Request("http://localhost:3000/api/admin/finance/ledger-adjustment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entryType: "platform_commission",
        amountCents: 1500,
        direction: "credit",
        dedupeKey: "manual:test:bad-type",
      }),
    });
    const res = await postLedgerAdjustment(req);
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(json.error).toBe("entryType not allowed for manual POST");
    expect(financeRouteMocks.upsertLedgerEntry).not.toHaveBeenCalled();
  });

  it("normalizes and persists allowed manual credit adjustment with audit trail", async () => {
    const req = new Request("http://localhost:3000/api/admin/finance/ledger-adjustment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entryType: "manual_adjustment",
        amountCents: -1234.9,
        direction: "credit",
        entryDate: "2026-04-10T21:31:00.000Z",
        dedupeKey: "manual:adjustment:case-1",
        notes: "Ops correction",
      }),
    });
    const res = await postLedgerAdjustment(req);
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.dedupeKey).toBe("manual:adjustment:case-1");
    expect(financeRouteMocks.upsertLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: "manual_adjustment",
        amountCents: 1235,
        direction: "credit",
        dedupeKey: "manual:adjustment:case-1",
      }),
    );
    expect(financeRouteMocks.logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finance.ledger_manual_entry",
        reason: "Ops correction",
      }),
    );
  });

  it("returns 400 for invalid JSON on finance scenario route", async () => {
    const req = new Request("http://localhost:3000/api/admin/finance/scenarios", {
      method: "POST",
      body: "{oops",
    });
    const res = await postFinanceScenario(req);
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns simulation output contract on valid scenario payload", async () => {
    const req = new Request("http://localhost:3000/api/admin/finance/scenarios", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        classPriceCents: 4500,
        avgPax: 6,
        seatsPerWeek: 36,
      }),
    });
    const res = await postFinanceScenario(req);
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(json.id).toBe("sim_1");
    expect(typeof json.outputs).toBe("object");
  });
});
