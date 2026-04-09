import { describe, expect, it } from "vitest";
import {
  commissionCentsFromLine,
  getMarketingCheckoutCommissionPctLabel,
  resolveCommissionBps,
  resolveGlobalCommissionBps,
} from "./commission";

describe("commission helpers", () => {
  it("uses locked global commission for product", async () => {
    const bps = await resolveGlobalCommissionBps("product");
    expect(bps).toBe(500);
  });

  it("uses locked global commission for bookings too", async () => {
    const bps = await resolveCommissionBps("studio_1", "booking");
    expect(bps).toBe(500);
  });

  it("calculates commission cents with floor rounding", () => {
    expect(commissionCentsFromLine(9_999, 375)).toBe(374);
  });

  it("returns locked single percentage label", async () => {
    const label = await getMarketingCheckoutCommissionPctLabel();
    expect(label).toBe("5%");
  });
});

