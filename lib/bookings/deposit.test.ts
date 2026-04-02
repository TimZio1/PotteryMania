import { describe, expect, it } from "vitest";
import { depositChargedCents } from "./deposit";

describe("depositChargedCents", () => {
  it("charges full line when bps is 0", () => {
    expect(depositChargedCents(10_000, 0)).toBe(10_000);
  });

  it("charges percentage rounded up", () => {
    expect(depositChargedCents(10_000, 2500)).toBe(2500);
    expect(depositChargedCents(100, 3333)).toBe(34);
  });

  it("never exceeds full line", () => {
    expect(depositChargedCents(500, 10_000)).toBe(500);
  });

  it("returns 0 for non-positive line", () => {
    expect(depositChargedCents(0, 2500)).toBe(0);
  });
});
