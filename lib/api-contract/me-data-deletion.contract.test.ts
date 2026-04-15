import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  checkRateLimit: vi.fn(),
  txCustomerProfileUpdateMany: vi.fn(),
  txBookingUpdateMany: vi.fn(),
  txOrderUpdateMany: vi.fn(),
  txBookingWaitlistEntryUpdateMany: vi.fn(),
  txGiftCardUpdateMany: vi.fn(),
  txUserUpdate: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getSessionUser: () => mocks.getSessionUser(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: async (fn: (tx: Record<string, unknown>) => Promise<void>) =>
      fn({
        customerProfile: { updateMany: (...args: unknown[]) => mocks.txCustomerProfileUpdateMany(...args) },
        booking: { updateMany: (...args: unknown[]) => mocks.txBookingUpdateMany(...args) },
        order: { updateMany: (...args: unknown[]) => mocks.txOrderUpdateMany(...args) },
        bookingWaitlistEntry: { updateMany: (...args: unknown[]) => mocks.txBookingWaitlistEntryUpdateMany(...args) },
        giftCard: { updateMany: (...args: unknown[]) => mocks.txGiftCardUpdateMany(...args) },
        user: { update: (...args: unknown[]) => mocks.txUserUpdate(...args) },
      }),
  },
}));

import { DELETE } from "@/app/api/me/data-deletion/route";

describe("API contract: DELETE /api/me/data-deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({
      id: "user_12345678",
      email: "customer@example.com",
      role: "customer",
    });
    mocks.checkRateLimit.mockReturnValue({ allowed: true });
    mocks.txCustomerProfileUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txBookingUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txOrderUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txBookingWaitlistEntryUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txGiftCardUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txUserUpdate.mockResolvedValue({ id: "user_12345678" });
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getSessionUser.mockResolvedValueOnce(null);
    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    mocks.checkRateLimit.mockReturnValueOnce({ allowed: false });
    const res = await DELETE();
    expect(res.status).toBe(429);
  });

  it("anonymizes user and clears session cookies", async () => {
    const res = await DELETE();
    const json = (await res.json()) as { ok: boolean; message: string };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mocks.txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_12345678" },
        data: expect.objectContaining({
          email: expect.stringContaining("deleted+user_12345678"),
          suspendedReason: "self_deleted",
          marketingConsent: false,
        }),
      }),
    );

    const setCookieHeader = res.headers.get("set-cookie") ?? "";
    expect(setCookieHeader).toContain("next-auth.session-token");
    expect(setCookieHeader).toContain("__Secure-authjs.session-token");
  });
});
