import { prisma } from "@/lib/db";

const BOOKING_THRESHOLD = 3;
const PRODUCT_THRESHOLD = 5;

export const UPGRADE_MOMENTUM_MESSAGE =
  "Your studio is getting active. Review workspace billing when you are ready.";

/**
 * Studios that hit momentum signals: real usage → nudge toward paid tier / billing.
 */
export async function getStudioIdsWithUpgradeMomentum(studioIds: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (studioIds.length === 0) return out;

  const [bookingGroups, productGroups, paidVendors] = await Promise.all([
    prisma.booking.groupBy({
      by: ["studioId"],
      where: { studioId: { in: studioIds } },
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ["studioId"],
      where: { studioId: { in: studioIds }, status: "active" },
      _count: { _all: true },
    }),
    prisma.orderItem.findMany({
      where: { vendorId: { in: studioIds }, order: { paymentStatus: "paid" } },
      distinct: ["vendorId"],
      select: { vendorId: true },
    }),
  ]);

  for (const row of paidVendors) {
    out.add(row.vendorId);
  }
  for (const row of bookingGroups) {
    if (row._count._all >= BOOKING_THRESHOLD) out.add(row.studioId);
  }
  for (const row of productGroups) {
    if (row._count._all >= PRODUCT_THRESHOLD) out.add(row.studioId);
  }

  return out;
}
