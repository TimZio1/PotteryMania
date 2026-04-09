import { beforeEach, describe, expect, it, vi } from "vitest";

const earlyAccessMocks = vi.hoisted(() => ({
  assertRateLimit: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  sendEarlyAccessEmails: vi.fn(),
  sendMetaConversionsLead: vi.fn(),
  clientIpFromRequest: vi.fn(),
  sanitizeMetaEventId: vi.fn(),
  logApiError: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  assertRateLimit: earlyAccessMocks.assertRateLimit,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    earlyAccessSignup: {
      findUnique: earlyAccessMocks.findUnique,
      create: earlyAccessMocks.create,
    },
  },
}));

vi.mock("@/lib/email/early-access-notify", () => ({
  sendEarlyAccessEmails: earlyAccessMocks.sendEarlyAccessEmails,
}));

vi.mock("@/lib/meta-conversions-api", () => ({
  sendMetaConversionsLead: earlyAccessMocks.sendMetaConversionsLead,
  clientIpFromRequest: earlyAccessMocks.clientIpFromRequest,
  sanitizeMetaEventId: earlyAccessMocks.sanitizeMetaEventId,
}));

vi.mock("@/lib/monitoring", () => ({
  logApiError: earlyAccessMocks.logApiError,
}));

import { POST } from "@/app/api/early-access/route";

describe("API contract: POST /api/early-access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    earlyAccessMocks.assertRateLimit.mockReturnValue({ allowed: true });
    earlyAccessMocks.findUnique.mockResolvedValue(null);
    earlyAccessMocks.create.mockResolvedValue({
      id: "signup_1",
      email: "studio@example.com",
      studioName: "Clay House",
      country: "Greece",
      websiteOrIg: null,
      wantBooking: true,
      wantMarket: false,
      wantBoth: false,
    });
    earlyAccessMocks.sendEarlyAccessEmails.mockResolvedValue(undefined);
    earlyAccessMocks.sendMetaConversionsLead.mockResolvedValue(undefined);
    earlyAccessMocks.clientIpFromRequest.mockReturnValue("127.0.0.1");
    earlyAccessMocks.sanitizeMetaEventId.mockReturnValue("event_1");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost:3000/api/early-access", {
      method: "POST",
      body: "{not-json",
    });

    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns 400 for invalid email", async () => {
    const req = new Request("http://localhost:3000/api/early-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "bad-email",
        studioName: "Clay House",
        country: "Greece",
      }),
    });

    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(json.error).toBe("Valid email is required");
  });

  it("returns 409 when email already exists", async () => {
    earlyAccessMocks.findUnique.mockResolvedValue({ id: "existing_1" });
    const req = new Request("http://localhost:3000/api/early-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "studio@example.com",
        studioName: "Clay House",
        country: "Greece",
      }),
    });

    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(409);
    expect(json.error).toBe("This email is already registered for early access");
  });

  it("returns success contract for valid submission", async () => {
    const req = new Request("http://localhost:3000/api/early-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "studio@example.com",
        studioName: "Clay House",
        country: "Greece",
        wantBooking: true,
      }),
    });

    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(earlyAccessMocks.create).toHaveBeenCalledTimes(1);
    expect(earlyAccessMocks.sendEarlyAccessEmails).toHaveBeenCalledTimes(1);
  });
});
