import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { refundEligibilityFromPolicySnapshot } from "./cancellation-policy";

describe("refundEligibilityFromPolicySnapshot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns full refund when no snapshot", () => {
    vi.setSystemTime(new Date("2026-01-10T12:00:00Z"));
    const slotDate = new Date("2026-01-15T00:00:00Z");
    const r = refundEligibilityFromPolicySnapshot(null, {
      slotDate,
      startTime: "10:00",
      totalAmountCents: 10000,
      paidCents: 10000,
    });
    expect(r.refundOutcome).toBe("no_policy_full_refund");
    expect(r.refundAmountCents).toBe(10000);
  });

  it("non_refundable yields zero", () => {
    vi.setSystemTime(new Date("2026-01-10T12:00:00Z"));
    const r = refundEligibilityFromPolicySnapshot(
      { policyType: "non_refundable" },
      {
        slotDate: new Date("2026-01-20T00:00:00Z"),
        startTime: "10:00",
        totalAmountCents: 10000,
        paidCents: 5000,
      },
    );
    expect(r.refundOutcome).toBe("non_refundable");
    expect(r.refundAmountCents).toBe(0);
  });

  it("refundable_until_hours: before deadline → full paid", () => {
    vi.setSystemTime(new Date("2026-01-10T12:00:00Z"));
    const r = refundEligibilityFromPolicySnapshot(
      { policyType: "refundable_until_hours", hoursBeforeStart: 24 },
      {
        slotDate: new Date("2026-01-12T00:00:00Z"),
        startTime: "18:00",
        totalAmountCents: 10000,
        paidCents: 8000,
      },
    );
    expect(r.refundOutcome).toBe("full_refund_eligible");
    expect(r.refundAmountCents).toBe(8000);
  });

  it("refundable_until_hours: after deadline → none", () => {
    vi.setSystemTime(new Date("2026-01-11T20:00:00Z"));
    const r = refundEligibilityFromPolicySnapshot(
      { policyType: "refundable_until_hours", hoursBeforeStart: 48 },
      {
        slotDate: new Date("2026-01-12T00:00:00Z"),
        startTime: "10:00",
        totalAmountCents: 10000,
        paidCents: 8000,
      },
    );
    expect(r.refundOutcome).toBe("past_deadline");
    expect(r.refundAmountCents).toBe(0);
  });

  it("partial_refund_until_hours respects percentage cap", () => {
    vi.setSystemTime(new Date("2026-01-10T12:00:00Z"));
    const r = refundEligibilityFromPolicySnapshot(
      { policyType: "partial_refund_until_hours", hoursBeforeStart: 1, refundPercentage: 50 },
      {
        slotDate: new Date("2026-01-12T00:00:00Z"),
        startTime: "18:00",
        totalAmountCents: 10000,
        paidCents: 10000,
      },
    );
    expect(r.refundOutcome).toBe("partial_refund_eligible");
    expect(r.refundAmountCents).toBe(5000);
  });
});
