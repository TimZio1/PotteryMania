import { beforeEach, describe, expect, it, vi } from "vitest";

const impersonateMocks = vi.hoisted(() => ({
  assertRateLimit: vi.fn(),
  requireHyperAdminUser: vi.fn(),
  isAdminRole: vi.fn(),
  userFindUnique: vi.fn(),
  grantDeleteMany: vi.fn(),
  grantCreate: vi.fn(),
  logAdminAction: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  assertRateLimit: impersonateMocks.assertRateLimit,
}));

vi.mock("@/lib/auth-session", () => ({
  requireHyperAdminUser: impersonateMocks.requireHyperAdminUser,
  isAdminRole: impersonateMocks.isAdminRole,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: impersonateMocks.userFindUnique },
    impersonationGrant: {
      deleteMany: impersonateMocks.grantDeleteMany,
      create: impersonateMocks.grantCreate,
    },
  },
}));

vi.mock("@/lib/admin-audit", () => ({
  logAdminAction: impersonateMocks.logAdminAction,
}));

import { POST } from "@/app/api/admin/users/[id]/impersonate/route";

describe("API contract: POST /api/admin/users/[id]/impersonate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    impersonateMocks.assertRateLimit.mockReturnValue({ allowed: true });
    impersonateMocks.requireHyperAdminUser.mockResolvedValue({
      id: "u-hyper",
      email: "hyper@example.com",
      role: "hyper_admin",
    });
    impersonateMocks.isAdminRole.mockReturnValue(false);
    impersonateMocks.userFindUnique.mockResolvedValue({
      id: "u-target",
      email: "target@example.com",
      role: "customer",
      suspendedAt: null,
    });
    impersonateMocks.grantDeleteMany.mockResolvedValue({ count: 1 });
    impersonateMocks.grantCreate.mockResolvedValue({ id: "grant_1" });
    impersonateMocks.logAdminAction.mockResolvedValue(undefined);
  });

  it("returns 429 when rate limiter blocks attempts", async () => {
    impersonateMocks.assertRateLimit.mockReturnValue({ allowed: false });
    const req = new Request("http://localhost:3000/api/admin/users/u-target/impersonate", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "u-target" }) });
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(429);
    expect(json.error).toBe("Too many impersonation attempts");
  });

  it("returns 403 when requester is not hyper_admin", async () => {
    impersonateMocks.requireHyperAdminUser.mockResolvedValue(null);
    const req = new Request("http://localhost:3000/api/admin/users/u-target/impersonate", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "u-target" }) });
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(403);
    expect(json.error).toBe("Forbidden — hyper_admin only");
  });

  it("returns 400 when target id is invalid/self", async () => {
    const req = new Request("http://localhost:3000/api/admin/users/u-hyper/impersonate", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "u-hyper" }) });
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid target");
  });

  it("returns 400 when target account is admin-level", async () => {
    impersonateMocks.userFindUnique.mockResolvedValue({
      id: "u-admin",
      email: "admin@example.com",
      role: "admin",
      suspendedAt: null,
    });
    impersonateMocks.isAdminRole.mockReturnValue(true);
    const req = new Request("http://localhost:3000/api/admin/users/u-admin/impersonate", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "u-admin" }) });
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(json.error).toBe("Cannot impersonate admin accounts");
  });

  it("returns grant id for valid impersonation request", async () => {
    const req = new Request("http://localhost:3000/api/admin/users/u-target/impersonate", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "u-target" }) });
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.grantId).toBe("grant_1");
    expect(impersonateMocks.grantDeleteMany).toHaveBeenCalledTimes(1);
    expect(impersonateMocks.grantCreate).toHaveBeenCalledTimes(1);
    expect(impersonateMocks.logAdminAction).toHaveBeenCalledTimes(1);
  });
});
