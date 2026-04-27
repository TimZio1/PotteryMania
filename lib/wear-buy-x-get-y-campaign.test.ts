import { describe, expect, it } from "vitest";
import { computeWearBuyXGetYDiscount } from "./wear-buy-x-get-y-campaign";

describe("computeWearBuyXGetYDiscount", () => {
  it("makes the lowest-priced unit free for each group of five", () => {
    const result = computeWearBuyXGetYDiscount([
      { key: "expensive", quantity: 4, unitCents: 2999 },
      { key: "cheap", quantity: 1, unitCents: 1999 },
    ]);

    expect(result.freeItemCount).toBe(1);
    expect(result.discountCents).toBe(1999);
    expect(result.discountByKey).toMatchObject({ cheap: 1999, expensive: 0 });
  });

  it("handles multiple groups by discounting the cheapest units first", () => {
    const result = computeWearBuyXGetYDiscount([
      { key: "a", quantity: 3, unitCents: 1999 },
      { key: "b", quantity: 7, unitCents: 2499 },
    ]);

    expect(result.freeItemCount).toBe(2);
    expect(result.discountCents).toBe(3998);
    expect(result.discountByKey.a).toBe(3998);
    expect(result.discountByKey.b).toBe(0);
  });

  it("does not discount carts below five units", () => {
    const result = computeWearBuyXGetYDiscount([{ key: "a", quantity: 4, unitCents: 1999 }]);

    expect(result.freeItemCount).toBe(0);
    expect(result.discountCents).toBe(0);
    expect(result.lineTotalAfterByKey.a).toBe(7996);
  });
});
