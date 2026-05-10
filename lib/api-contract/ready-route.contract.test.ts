import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/ready/route";

const dbMocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => dbMocks.queryRaw(...args),
  },
}));

describe("API contract: GET /api/ready", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);
  });

  it("returns ready when the database ping succeeds", async () => {
    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ ok: true, service: "potterymania", db: "ok" });
  });

  it("keeps readiness passing when PostgreSQL has exhausted connection slots", async () => {
    dbMocks.queryRaw.mockRejectedValue(new Error("remaining connection slots are reserved for non-replication superuser connections"));

    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      ok: true,
      service: "potterymania",
      db: "transient_connection_pool_exhausted",
    });
  });

  it("keeps genuine database failures as unavailable", async () => {
    dbMocks.queryRaw.mockRejectedValue(new Error("relation studios does not exist"));

    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(503);
    expect(json).toMatchObject({
      ok: false,
      service: "potterymania",
      db: "error",
      error: "relation studios does not exist",
    });
  });
});
