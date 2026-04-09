import { beforeEach, describe, expect, it, vi } from "vitest";

const refundRouteMocks = vi.hoisted(() => ({
  requireHyperAdminUser: vi.fn(),
  executeAdminStripeOrderRefund: vi.fn(),
  logAdminAction: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  requireHyperAdminUser: refundRouteMocks.requireHyperAdminUser,
}));

vi.mock("@/lib/orders/admin-stripe-order-refund", () => ({
  executeAdminStripeOrderRefund: refundRouteMocks.executeAdminStripeOrderRefund,
}));

vi.mock("@/lib/admin-audit", () => ({
  logAdminAction: refundRouteMocks.logAdminAction,
}));

import { POST } from "@/app/api/admin/orders/[orderId]/refund/route";

describe("API contract: POST /api/admin/orders/[orderId]/refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refundRouteMocks.requireHyperAdminUser.mockResolvedValue({
      id: "u-hyper",
      email: "hyper@example.com",
      role: "hyper_admin",
    });
    refundRouteMocks.executeAdminStripeOrderRefund.mockResolvedValue({
      ok: true,
      refundId: "re_123",
      amountCents: 1200,
      fullyRefunded: true,
    });
    refundRouteMocks.logAdminAction.mockResolvedValue(undefined);
  });

  it("returns 403 when requester is not hyper_admin", async () => {
    refundRouteMocks.requireHyperAdminUser.mockResolvedValue(null);
    const req = new Request("http://localhost:3000/api/admin/orders/o_1/refund", {
      method: "POST",
      body: "{}",
    });

    const res = await POST(req, { params: Promise.resolve({ orderId: "o_1" }) });
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(403);
    expect(json.error).toBe("Forbidden — hyper_admin only");
  });

  it("returns 400 for invalid JSON payload", async () => {
    const req = new Request("http://localhost:3000/api/admin/orders/o_1/refund", {
      method: "POST",
      body: "{oops",
    });

    const res = await POST(req, { params: Promise.resolve({ orderId: "o_1" }) });
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns success payload when refund execution succeeds", async () => {
    const req = new Request("http://localhost:3000/api/admin/orders/o_1/refund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "duplicate order", amountCents: 1200 }),
    });

    const res = await POST(req, { params: Promise.resolve({ orderId: "o_1" }) });
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.refundId).toBe("re_123");
  });
});
