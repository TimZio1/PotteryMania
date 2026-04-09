import { describe, expect, it, vi } from "vitest";

const guardMocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  requireAdminUser: () => guardMocks.requireAdminUser(),
}));

import { requireFinanceAdmin } from "@/lib/finance/admin-guard";

describe("requireFinanceAdmin", () => {
  it("returns forbidden response when admin session is missing", async () => {
    guardMocks.requireAdminUser.mockResolvedValueOnce(null);
    const result = await requireFinanceAdmin();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(403);
    await expect(result.response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns ok with admin user when authorized", async () => {
    guardMocks.requireAdminUser.mockResolvedValueOnce({
      id: "u-admin",
      email: "admin@example.com",
      role: "admin",
    });
    const result = await requireFinanceAdmin();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user).toEqual({
      id: "u-admin",
      email: "admin@example.com",
      role: "admin",
    });
  });
});
