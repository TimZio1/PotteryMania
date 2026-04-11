import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const healthMocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  stripeBalanceRetrieve: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: healthMocks.queryRaw,
  },
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    balance: { retrieve: healthMocks.stripeBalanceRetrieve },
  }),
}));

import { GET } from "@/app/api/health/route";

describe("API contract: GET /api/health", () => {
  const originalStripeKey = process.env.STRIPE_SECRET_KEY;
  const originalSpreadconnectKey = process.env.SPREADCONNECT_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    healthMocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    healthMocks.stripeBalanceRetrieve.mockResolvedValue({ object: "balance" });
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.SPREADCONNECT_API_KEY;
  });

  it("returns 200 and contract keys when DB is healthy", async () => {
    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(typeof json.t).toBe("number");
    expect(json.db).toBe("ok");
    expect(json.stripe).toBe("skipped");
    expect(json.spreadconnect).toBe("missing");
  });

  it("returns 503 and includes db error details when DB fails", async () => {
    healthMocks.queryRaw.mockRejectedValue(new Error("db-down"));

    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(503);
    expect(json.ok).toBe(false);
    expect(json.db).toBe("error");
    expect(typeof json.dbError).toBe("string");
  });

  it("reports spreadconnect pending placeholder explicitly", async () => {
    process.env.SPREADCONNECT_API_KEY = "__PENDING__";

    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.spreadconnect).toBe("pending_placeholder");
  });

  it("checks stripe reachability when Stripe key is configured", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.stripe).toBe("ok");
    expect(healthMocks.stripeBalanceRetrieve).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    if (originalStripeKey) process.env.STRIPE_SECRET_KEY = originalStripeKey;
    else delete process.env.STRIPE_SECRET_KEY;
    if (originalSpreadconnectKey) process.env.SPREADCONNECT_API_KEY = originalSpreadconnectKey;
    else delete process.env.SPREADCONNECT_API_KEY;
  });
});
