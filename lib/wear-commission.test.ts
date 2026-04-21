import { describe, it, expect } from "vitest";
import {
  calculateWearPrice,
  calculateWearMarginCents,
  formatWearMarginPercentFromBps,
  resolveStudioMarginBps,
  type WearGlobalPricingConfig,
} from "./wear-commission";

const GLOBAL: WearGlobalPricingConfig = {
  defaultMarginBps: 2000,
  minMarginBps: 1000,
  maxMarginBps: 5000,
  marginLocked: false,
};

describe("resolveStudioMarginBps", () => {
  it("clamps below minimum", () => {
    expect(resolveStudioMarginBps(500, GLOBAL)).toBe(1000);
  });

  it("clamps above maximum", () => {
    expect(resolveStudioMarginBps(9000, GLOBAL)).toBe(5000);
  });

  it("passes through within range", () => {
    expect(resolveStudioMarginBps(3000, GLOBAL)).toBe(3000);
  });

  it("returns default when locked", () => {
    const locked = { ...GLOBAL, marginLocked: true };
    expect(resolveStudioMarginBps(4000, locked)).toBe(2000);
  });

  it("returns exact min boundary", () => {
    expect(resolveStudioMarginBps(1000, GLOBAL)).toBe(1000);
  });

  it("returns exact max boundary", () => {
    expect(resolveStudioMarginBps(5000, GLOBAL)).toBe(5000);
  });
});

describe("formatWearMarginPercentFromBps", () => {
  it("formats basis points as a percent label", () => {
    expect(formatWearMarginPercentFromBps(2000)).toBe("20.0%");
    expect(formatWearMarginPercentFromBps(1750)).toBe("17.5%");
  });

  it("handles invalid input", () => {
    expect(formatWearMarginPercentFromBps(Number.NaN)).toBe("0.0%");
  });
});

describe("calculateWearPrice", () => {
  it("adds 20% margin to base price", () => {
    const result = calculateWearPrice(2000, 2000);
    expect(result).toBeGreaterThan(2000);
  });

  it("returns base price when margin is 0", () => {
    expect(calculateWearPrice(2000, 0)).toBe(2000);
  });

  it("smart rounds to X9 for prices ending 7-9", () => {
    // 1500 + 50% = 2250 → rounds to 23 euros → last digit 3 → X5 → 2500
    const result = calculateWearPrice(1500, 5000);
    expect(result % 100).toBe(0);
    expect(result).toBe(2500);
  });

  it("smart rounds to X5 for prices ending 3-6", () => {
    // 2200 + 20% = 2640 → 26 euros → last digit 6 → X5 → 2500
    const result = calculateWearPrice(2200, 2000);
    expect(result).toBe(2500);
  });

  it("smart rounds to X0 for prices ending 0-2", () => {
    // 2500 + 20% = 3000 → 30 euros → last digit 0 → X0 → 3000
    const result = calculateWearPrice(2500, 2000);
    expect(result).toBe(3000);
  });

  it("does not smart-round prices under €5", () => {
    const result = calculateWearPrice(300, 2000);
    expect(result).toBe(360);
  });

  it("handles zero base price", () => {
    expect(calculateWearPrice(0, 2000)).toBe(0);
  });

  it("handles large margins correctly", () => {
    const result = calculateWearPrice(1000, 10000);
    expect(result).toBeGreaterThanOrEqual(2000);
  });

  it("produces attractive price points", () => {
    const result = calculateWearPrice(1800, 2500);
    const euros = result / 100;
    const lastDigit = Math.round(euros) % 10;
    expect([0, 5, 9]).toContain(lastDigit);
  });
});

describe("calculateWearMarginCents", () => {
  it("returns difference between final and base", () => {
    expect(calculateWearMarginCents(2000, 2500)).toBe(500);
  });

  it("returns zero when prices are equal", () => {
    expect(calculateWearMarginCents(2000, 2000)).toBe(0);
  });

  it("handles smart-rounded final prices", () => {
    const finalPrice = calculateWearPrice(2000, 2000);
    const margin = calculateWearMarginCents(2000, finalPrice);
    expect(margin).toBeGreaterThan(0);
    expect(margin).toBe(finalPrice - 2000);
  });
});
