import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: () => sessionMocks.auth(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => sessionMocks.findUnique(...args),
    },
  },
}));

async function loadRequireAdmin() {
  const { requireAdminUser } = await import("@/lib/auth-session");
  return requireAdminUser;
}

describe("requireAdminUser", () => {
  beforeEach(() => {
    vi.resetModules();
    sessionMocks.auth.mockReset();
    sessionMocks.findUnique.mockReset();
  });

  it("allows hyper_admin", async () => {
    sessionMocks.auth.mockResolvedValue({ user: { id: "u-hyper" } });
    sessionMocks.findUnique.mockResolvedValue({
      id: "u-hyper",
      email: "hyper@example.com",
      role: "hyper_admin",
      suspendedAt: null,
    });
    const requireAdminUser = await loadRequireAdmin();
    expect(await requireAdminUser()).toEqual({
      id: "u-hyper",
      email: "hyper@example.com",
      role: "hyper_admin",
    });
  });

  it("allows admin", async () => {
    sessionMocks.auth.mockResolvedValue({ user: { id: "u-admin" } });
    sessionMocks.findUnique.mockResolvedValue({
      id: "u-admin",
      email: "admin@example.com",
      role: "admin",
      suspendedAt: null,
    });
    const requireAdminUser = await loadRequireAdmin();
    expect(await requireAdminUser()).toEqual({
      id: "u-admin",
      email: "admin@example.com",
      role: "admin",
    });
  });

  it("blocks vendor and customer roles", async () => {
    const requireAdminUser = await loadRequireAdmin();

    sessionMocks.auth.mockResolvedValue({ user: { id: "u-vendor" } });
    sessionMocks.findUnique.mockResolvedValue({
      id: "u-vendor",
      email: "vendor@example.com",
      role: "vendor",
      suspendedAt: null,
    });
    expect(await requireAdminUser()).toBeNull();

    sessionMocks.auth.mockResolvedValue({ user: { id: "u-customer" } });
    sessionMocks.findUnique.mockResolvedValue({
      id: "u-customer",
      email: "customer@example.com",
      role: "customer",
      suspendedAt: null,
    });
    expect(await requireAdminUser()).toBeNull();
  });

  it("blocks suspended users", async () => {
    sessionMocks.auth.mockResolvedValue({ user: { id: "u-suspended" } });
    sessionMocks.findUnique.mockResolvedValue({
      id: "u-suspended",
      email: "suspended@example.com",
      role: "admin",
      suspendedAt: new Date(),
    });
    const requireAdminUser = await loadRequireAdmin();
    expect(await requireAdminUser()).toBeNull();
  });

  it("blocks impersonated sessions before DB lookup", async () => {
    sessionMocks.auth.mockResolvedValue({
      user: { id: "u-target", impersonatorId: "u-admin" },
    });
    const requireAdminUser = await loadRequireAdmin();
    expect(await requireAdminUser()).toBeNull();
    expect(sessionMocks.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when no active session", async () => {
    sessionMocks.auth.mockResolvedValue(null);
    const requireAdminUser = await loadRequireAdmin();
    expect(await requireAdminUser()).toBeNull();
  });
});
