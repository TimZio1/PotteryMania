import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const ADMIN_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "fulfilled",
  "cancelled",
  "refunded",
  "partially_refunded",
];

export function adminOrdersWhere(opts: { studioId?: string | null; status?: string | null }): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  const sid = opts.studioId?.trim();
  if (sid) where.items = { some: { vendorId: sid } };
  const st = opts.status?.trim();
  if (st && ADMIN_ORDER_STATUSES.includes(st as OrderStatus)) {
    where.orderStatus = st as OrderStatus;
  }
  return where;
}

const listInclude = {
  items: { include: { vendor: { select: { id: true, displayName: true } } } },
  payments: true,
} satisfies Prisma.OrderInclude;

export type AdminOrderListRow = Prisma.OrderGetPayload<{ include: typeof listInclude }>;

export async function findAdminOrdersForList(opts: {
  studioId?: string | null;
  status?: string | null;
  take?: number;
}): Promise<AdminOrderListRow[]> {
  const take = opts.take ?? 100;
  return prisma.order.findMany({
    where: adminOrdersWhere(opts),
    orderBy: { createdAt: "desc" },
    take,
    include: listInclude,
  });
}

const detailInclude = {
  items: {
    include: {
      vendor: { select: { id: true, displayName: true } },
      product: { select: { id: true, title: true } },
      booking: { select: { id: true } },
    },
  },
  payments: true,
  customerUser: { select: { id: true, email: true } },
} satisfies Prisma.OrderInclude;

export type AdminOrderDetail = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;

export async function findAdminOrderById(id: string): Promise<AdminOrderDetail | null> {
  return prisma.order.findUnique({
    where: { id },
    include: detailInclude,
  });
}
