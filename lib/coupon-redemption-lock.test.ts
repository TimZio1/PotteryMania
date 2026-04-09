import { describe, expect, it, vi } from "vitest";
import { couponHasRedemptionCapacity, lockCouponRow } from "./coupon-redemption-lock";

function makeTx() {
  return {
    $executeRawUnsafe: vi.fn(),
    coupon: {
      findUnique: vi.fn(),
    },
    discountRedemption: {
      count: vi.fn(),
    },
  };
}

describe("coupon redemption lock", () => {
  it("locks coupon row with SELECT FOR UPDATE", async () => {
    const tx = makeTx();
    tx.$executeRawUnsafe.mockResolvedValueOnce(1);
    await lockCouponRow(tx as never, "coupon_1");
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
      "SELECT id FROM coupons WHERE id = $1::uuid FOR UPDATE",
      "coupon_1",
    );
  });

  it("returns false when coupon is missing or inactive", async () => {
    const tx = makeTx();
    tx.coupon.findUnique.mockResolvedValueOnce(null);
    await expect(couponHasRedemptionCapacity(tx as never, "coupon_1")).resolves.toBe(false);

    tx.coupon.findUnique.mockResolvedValueOnce({ id: "coupon_1", isActive: false, maxRedemptions: 10 });
    await expect(couponHasRedemptionCapacity(tx as never, "coupon_1")).resolves.toBe(false);
  });

  it("returns true for active coupon with unlimited redemptions", async () => {
    const tx = makeTx();
    tx.coupon.findUnique.mockResolvedValueOnce({ id: "coupon_1", isActive: true, maxRedemptions: null });
    tx.discountRedemption.count.mockResolvedValueOnce(999);
    await expect(couponHasRedemptionCapacity(tx as never, "coupon_1")).resolves.toBe(true);
  });

  it("returns true when redemption count is below max", async () => {
    const tx = makeTx();
    tx.coupon.findUnique.mockResolvedValueOnce({ id: "coupon_1", isActive: true, maxRedemptions: 3 });
    tx.discountRedemption.count.mockResolvedValueOnce(2);
    await expect(couponHasRedemptionCapacity(tx as never, "coupon_1")).resolves.toBe(true);
  });

  it("returns false when redemption count reaches max", async () => {
    const tx = makeTx();
    tx.coupon.findUnique.mockResolvedValueOnce({ id: "coupon_1", isActive: true, maxRedemptions: 3 });
    tx.discountRedemption.count.mockResolvedValueOnce(3);
    await expect(couponHasRedemptionCapacity(tx as never, "coupon_1")).resolves.toBe(false);
  });
});
