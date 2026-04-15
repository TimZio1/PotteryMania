import { beforeEach, describe, expect, it, vi } from "vitest";

const commissionMocks = vi.hoisted(() => ({
  commissionRuleFindFirst: vi.fn(),
  adminConfigFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    commissionRule: {
      findFirst: (...args: unknown[]) => commissionMocks.commissionRuleFindFirst(...args),
    },
    adminConfig: {
      findUnique: (...args: unknown[]) => commissionMocks.adminConfigFindUnique(...args),
    },
  },
}));
import {
  commissionCentsFromLine,
  getMarketingCheckoutCommissionPctLabel,
  resolveCommissionBps,
  resolveGlobalCommissionBps,
} from "./commission";

describe("commission helpers", () => {
  beforeEach(() => {
    commissionMocks.commissionRuleFindFirst.mockReset();
    commissionMocks.adminConfigFindUnique.mockReset();
    commissionMocks.commissionRuleFindFirst.mockResolvedValue(null);
    commissionMocks.adminConfigFindUnique.mockResolvedValue(null);
  });

  it("uses locked global commission for product", async () => {
    const bps = await resolveGlobalCommissionBps("product");
    expect(bps).toBe(500);
  });

  it("uses locked global commission for bookings too", async () => {
    const bps = await resolveCommissionBps("studio_1", "booking");
    expect(bps).toBe(500);
  });

  it("uses active vendor override before global fallback", async () => {
    commissionMocks.commissionRuleFindFirst
      .mockResolvedValueOnce({ percentageBasisPoints: 720 })
      .mockResolvedValueOnce({ percentageBasisPoints: 500 });
    const bps = await resolveCommissionBps("studio_1", "product");
    expect(bps).toBe(720);
  });

  it("falls back to admin config value when no global rule exists", async () => {
    commissionMocks.commissionRuleFindFirst.mockResolvedValue(null);
    commissionMocks.adminConfigFindUnique.mockResolvedValue({ configValue: 640 });
    const bps = await resolveGlobalCommissionBps("booking");
    expect(bps).toBe(640);
  });

  it("supports object-shaped admin config values", async () => {
    commissionMocks.commissionRuleFindFirst.mockResolvedValue(null);
    commissionMocks.adminConfigFindUnique.mockResolvedValue({ configValue: { bps: 615 } });
    const bps = await resolveGlobalCommissionBps("product");
    expect(bps).toBe(615);
  });

  it("calculates commission cents with floor rounding", () => {
    expect(commissionCentsFromLine(9_999, 375)).toBe(374);
  });

  it("returns locked single percentage label", async () => {
    const label = await getMarketingCheckoutCommissionPctLabel();
    expect(label).toBe("5%");
  });
});

