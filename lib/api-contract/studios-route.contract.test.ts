import { beforeEach, describe, expect, it, vi } from "vitest";

const studioRouteMocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  studioCreate: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getSessionUser: () => studioRouteMocks.getSessionUser(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    studio: {
      create: (...args: unknown[]) => studioRouteMocks.studioCreate(...args),
    },
  },
}));

import { POST } from "@/app/api/studios/route";

describe("API contract: POST /api/studios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    studioRouteMocks.getSessionUser.mockResolvedValue({
      id: "u-vendor",
      email: "vendor@example.com",
      role: "vendor",
    });
    studioRouteMocks.studioCreate.mockResolvedValue({
      id: "studio_1",
      status: "approved",
      ownerUserId: "u-vendor",
    });
  });

  const basePayload = {
    displayName: "Clay Room",
    legalBusinessName: "Clay Room Ltd",
    vatNumber: "VAT-123",
    responsiblePersonName: "Alex Potter",
    email: "studio@example.com",
    country: "Portugal",
    city: "Porto",
    addressLine1: "Rua do Barro 10",
  };

  it("returns 401 when user is not authenticated", async () => {
    studioRouteMocks.getSessionUser.mockResolvedValueOnce(null);
    const req = new Request("http://localhost:3000/api/studios", {
      method: "POST",
      body: JSON.stringify(basePayload),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("allows authenticated customer with full fields to create an approved studio (self-serve)", async () => {
    studioRouteMocks.getSessionUser.mockResolvedValueOnce({
      id: "u-customer",
      email: "customer@example.com",
      role: "customer",
    });
    studioRouteMocks.studioCreate.mockResolvedValueOnce({
      id: "studio_customer_1",
      status: "approved",
      ownerUserId: "u-customer",
    });
    const req = new Request("http://localhost:3000/api/studios", {
      method: "POST",
      body: JSON.stringify(basePayload),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(201);
    expect(json.studio).toMatchObject({ id: "studio_customer_1", status: "approved" });
    expect(studioRouteMocks.studioCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerUserId: "u-customer",
          status: "approved",
          approvedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("allows customer free listing and auto-approves profile", async () => {
    studioRouteMocks.getSessionUser.mockResolvedValueOnce({
      id: "u-customer-1",
      email: "customer@example.com",
      role: "customer",
    });
    studioRouteMocks.studioCreate.mockResolvedValueOnce({
      id: "studio_free_1",
      status: "approved",
      ownerUserId: "u-customer-1",
    });
    const req = new Request("http://localhost:3000/api/studios", {
      method: "POST",
      body: JSON.stringify({
        displayName: "Cozy Ceramics",
        email: "cozy@example.com",
        country: "Spain",
        city: "Madrid",
        addressLine1: "Calle Arte 2",
        listingOnly: true,
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(studioRouteMocks.studioCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "approved",
          approvedAt: expect.any(Date),
          legalBusinessName: "Cozy Ceramics",
          vatNumber: expect.stringContaining("FREE-LISTING-"),
        }),
      }),
    );
  });

  it("quickStart creates studio with deferred-address placeholders", async () => {
    const req = new Request("http://localhost:3000/api/studios", {
      method: "POST",
      body: JSON.stringify({
        displayName: "Fast Studio",
        country: "Portugal",
        city: "",
        email: "vendor@example.com",
        quickStart: true,
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(studioRouteMocks.studioCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          displayName: "Fast Studio",
          country: "Portugal",
          city: "Pending",
          email: "vendor@example.com",
          legalBusinessName: "Fast Studio",
          addressLine1: "Pending — complete in Studio profile",
          vatNumber: expect.stringMatching(/^QUICKSTART-/),
          responsiblePersonName: "vendor",
          status: "approved",
          approvedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("creates vendor studio as approved (immediate self-serve)", async () => {
    const req = new Request("http://localhost:3000/api/studios", {
      method: "POST",
      body: JSON.stringify(basePayload),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(studioRouteMocks.studioCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "approved",
          approvedAt: expect.any(Date),
        }),
      }),
    );
  });
});
