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

async function loadRequireHyperAdmin() {
  const { requireHyperAdminUser } = await import("@/lib/auth-session");
  return requireHyperAdminUser;
}

describe("requireHyperAdminUser", () => {
  beforeEach(() => {
    vi.resetModules();
    sessionMocks.auth.mockReset();
    sessionMocks.findUnique.mockReset();
  });

  it("returns the user when role is hyper_admin", async () => {
    sessionMocks.auth.mockResolvedValue({ user: { id: "u-hyper" } });
    sessionMocks.findUnique.mockResolvedValue({
      id: "u-hyper",
      email: "hyper@example.com",
      role: "hyper_admin",
      suspendedAt: null,
    });
    const requireHyperAdminUser = await loadRequireHyperAdmin();
    const u = await requireHyperAdminUser();
    expect(u).toEqual({
      id: "u-hyper",
      email: "hyper@example.com",
      role: "hyper_admin",
    });
  });

  it("returns null for admin (non-hyper) role", async () => {
    sessionMocks.auth.mockResolvedValue({ user: { id: "u-admin" } });
    sessionMocks.findUnique.mockResolvedValue({
      id: "u-admin",
      email: "admin@example.com",
      role: "admin",
      suspendedAt: null,
    });
    const requireHyperAdminUser = await loadRequireHyperAdmin();
    expect(await requireHyperAdminUser()).toBeNull();
  });

  it("returns null for vendor", async () => {
    sessionMocks.auth.mockResolvedValue({ user: { id: "u-v" } });
    sessionMocks.findUnique.mockResolvedValue({
      id: "u-v",
      email: "v@example.com",
      role: "vendor",
      suspendedAt: null,
    });
    const requireHyperAdminUser = await loadRequireHyperAdmin();
    expect(await requireHyperAdminUser()).toBeNull();
  });

  it("returns null for customer", async () => {
    sessionMocks.auth.mockResolvedValue({ user: { id: "u-c" } });
    sessionMocks.findUnique.mockResolvedValue({
      id: "u-c",
      email: "c@example.com",
      role: "customer",
      suspendedAt: null,
    });
    const requireHyperAdminUser = await loadRequireHyperAdmin();
    expect(await requireHyperAdminUser()).toBeNull();
  });

  it("returns null when impersonation is active", async () => {
    sessionMocks.auth.mockResolvedValue({
      user: { id: "u-target", impersonatorId: "u-hyper-admin" },
    });
    const requireHyperAdminUser = await loadRequireHyperAdmin();
    expect(await requireHyperAdminUser()).toBeNull();
    expect(sessionMocks.findUnique).not.toHaveBeenCalled();
  });
});
