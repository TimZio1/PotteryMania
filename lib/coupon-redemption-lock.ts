import type { Prisma } from "@prisma/client";

/** Serialize coupon redemption updates (checkout + webhook). */
export async function lockCouponRow(tx: Prisma.TransactionClient, couponId: string): Promise<void> {
  await tx.$executeRawUnsafe(`SELECT id FROM coupons WHERE id = $1::uuid FOR UPDATE`, couponId);
}

/** Uses live redemption rows vs `maxRedemptions` (avoids stale `redeemedCount` races). */
export async function couponHasRedemptionCapacity(
  tx: Prisma.TransactionClient,
  couponId: string,
): Promise<boolean> {
  const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
  if (!coupon?.isActive) return false;
  const cnt = await tx.discountRedemption.count({ where: { couponId } });
  if (coupon.maxRedemptions == null) return true;
  return cnt < coupon.maxRedemptions;
}
