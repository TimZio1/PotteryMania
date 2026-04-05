import type { PrismaClient } from "@prisma/client";

export type StudioThroughput30d = {
  studioId: string;
  displayName: string;
  city: string;
  country: string;
  /** Sum of paid order line totals (price × qty) attributed to the studio. */
  orderGmvCents: number;
  /** Platform commission snapshots on those lines. */
  orderCommissionCents: number;
  /** Booking deposit cash collected (class checkout), last 30d. */
  bookingDepositsCents: number;
};

const MONETIZED_ORDER_STATUSES = ["paid", "processing", "fulfilled", "refunded", "partially_refunded"] as const;

/**
 * Approved studios with marketplace order GMV + commission (paid / settled order rows) and class deposit totals.
 * `windowStart` is inclusive start of day for a rolling window (e.g. 30 or 90 days).
 */
export async function studioThroughputLast30d(
  prisma: PrismaClient,
  windowStart: Date,
): Promise<StudioThroughput30d[]> {
  const [items, bookingGroups, studios] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: windowStart },
          OR: [{ paymentStatus: "paid" }, { orderStatus: { in: [...MONETIZED_ORDER_STATUSES] } }],
        },
      },
      select: {
        vendorId: true,
        priceSnapshotCents: true,
        quantity: true,
        commissionSnapshotCents: true,
      },
    }),
    prisma.booking.groupBy({
      by: ["studioId"],
      where: {
        createdAt: { gte: windowStart },
        paymentStatus: { in: ["paid", "partial"] },
      },
      _sum: { depositAmountCents: true },
    }),
    prisma.studio.findMany({
      where: { status: "approved" },
      select: { id: true, displayName: true, city: true, country: true },
      orderBy: { displayName: "asc" },
    }),
  ]);

  const orderByVendor = new Map<string, { gmv: number; commission: number }>();
  for (const it of items) {
    const line = it.priceSnapshotCents * Math.max(1, it.quantity);
    const cur = orderByVendor.get(it.vendorId) ?? { gmv: 0, commission: 0 };
    cur.gmv += line;
    cur.commission += it.commissionSnapshotCents;
    orderByVendor.set(it.vendorId, cur);
  }

  const depositByStudio = new Map<string, number>();
  for (const g of bookingGroups) {
    depositByStudio.set(g.studioId, g._sum.depositAmountCents ?? 0);
  }

  const rows: StudioThroughput30d[] = studios.map((s) => {
    const o = orderByVendor.get(s.id) ?? { gmv: 0, commission: 0 };
    return {
      studioId: s.id,
      displayName: s.displayName,
      city: s.city,
      country: s.country,
      orderGmvCents: o.gmv,
      orderCommissionCents: o.commission,
      bookingDepositsCents: depositByStudio.get(s.id) ?? 0,
    };
  });

  rows.sort(
    (a, b) =>
      b.orderGmvCents +
      b.bookingDepositsCents -
      (a.orderGmvCents + a.bookingDepositsCents),
  );

  return rows;
}
