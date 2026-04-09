import { beforeEach, describe, expect, it, vi } from "vitest";

const adminUserRouteMocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  userFindUnique: vi.fn(),
  userCount: vi.fn(),
  userUpdate: vi.fn(),
  orderAggregate: vi.fn(),
  normalizeAdminTags: vi.fn(),
  logAdminAction: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  requireAdminUser: adminUserRouteMocks.requireAdminUser,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: adminUserRouteMocks.userFindUnique,
      count: adminUserRouteMocks.userCount,
      update: adminUserRouteMocks.userUpdate,
    },
    order: {
      aggregate: adminUserRouteMocks.orderAggregate,
    },
  },
}));

vi.mock("@/lib/admin-user-tags", () => ({
  normalizeAdminTags: adminUserRouteMocks.normalizeAdminTags,
}));

vi.mock("@/lib/admin-audit", () => ({
  logAdminAction: adminUserRouteMocks.logAdminAction,
}));

import { PATCH } from "@/app/api/admin/users/[id]/route";

describe("API contract: PATCH /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminUserRouteMocks.requireAdminUser.mockResolvedValue({
      id: "u-admin",
      email: "admin@example.com",
      role: "admin",
    });
    adminUserRouteMocks.userFindUnique.mockResolvedValue({
      role: "vendor",
      suspendedAt: null,
      suspendedReason: null,
      adminTags: [],
    });
    adminUserRouteMocks.userCount.mockResolvedValue(2);
    adminUserRouteMocks.userUpdate.mockResolvedValue({
      id: "u-target",
      email: "target@example.com",
      role: "customer",
      suspendedAt: null,
      suspendedReason: null,
      adminTags: [],
    });
    adminUserRouteMocks.normalizeAdminTags.mockReturnValue([]);
    adminUserRouteMocks.logAdminAction.mockResolvedValue(undefined);
  });

  it("returns 403 when requester is not admin", async () => {
    adminUserRouteMocks.requireAdminUser.mockResolvedValue(null);
    const req = new Request("http://localhost:3000/api/admin/users/u-target", {
      method: "PATCH",
      body: "{}",
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "u-target" }) });
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  it("returns 400 when admin tries to modify own account", async () => {
    const req = new Request("http://localhost:3000/api/admin/users/u-admin", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "customer", reason: "cleanup" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "u-admin" }) });
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(json.error).toBe("You cannot modify your own account here.");
  });

  it("returns 403 when non-hyper admin attempts admin role assignment", async () => {
    const req = new Request("http://localhost:3000/api/admin/users/u-target", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "admin", reason: "promote user" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "u-target" }) });
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(403);
    expect(json.error).toBe("Only hyper_admin can assign admin roles");
  });

  it("returns 400 when trying to demote last hyper_admin", async () => {
    adminUserRouteMocks.requireAdminUser.mockResolvedValue({
      id: "u-hyper",
      email: "hyper@example.com",
      role: "hyper_admin",
    });
    adminUserRouteMocks.userFindUnique.mockResolvedValue({
      role: "hyper_admin",
      suspendedAt: null,
      suspendedReason: null,
      adminTags: [],
    });
    adminUserRouteMocks.userCount.mockResolvedValue(1);
    const req = new Request("http://localhost:3000/api/admin/users/u-target", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "admin", reason: "handover attempt" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "u-target" }) });
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(json.error).toBe("Cannot demote the last hyper_admin");
  });

  it("returns success contract for valid role update by hyper_admin", async () => {
    adminUserRouteMocks.requireAdminUser.mockResolvedValue({
      id: "u-hyper",
      email: "hyper@example.com",
      role: "hyper_admin",
    });
    adminUserRouteMocks.userFindUnique.mockResolvedValue({
      role: "vendor",
      suspendedAt: null,
      suspendedReason: null,
      adminTags: [],
    });
    adminUserRouteMocks.userUpdate.mockResolvedValue({
      id: "u-target",
      email: "target@example.com",
      role: "admin",
      suspendedAt: null,
      suspendedReason: null,
      adminTags: [],
    });

    const req = new Request("http://localhost:3000/api/admin/users/u-target", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "admin", reason: "promote for operations" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "u-target" }) });
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect((json.user as { role?: string })?.role).toBe("admin");
    expect(adminUserRouteMocks.userUpdate).toHaveBeenCalledTimes(1);
  });
});
