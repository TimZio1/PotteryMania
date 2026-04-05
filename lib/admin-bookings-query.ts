import type { BookingPaymentStatus, BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ADMIN_BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "awaiting_vendor_approval",
  "confirmed",
  "cancellation_requested",
  "cancelled_by_customer",
  "cancelled_by_vendor",
  "cancelled_by_admin",
  "completed",
  "refunded",
  "partially_refunded",
  "no_show",
];

export const ADMIN_BOOKING_PAYMENT_STATUSES: BookingPaymentStatus[] = [
  "pending",
  "partial",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
];

function parseDayUtc(s: string | null | undefined): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  return new Date(`${s}T00:00:00.000Z`);
}

export function adminBookingsWhere(opts: {
  studioId?: string | null;
  bookingStatus?: string | null;
  paymentStatus?: string | null;
  q?: string | null;
  slotFrom?: string | null;
  slotTo?: string | null;
}): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};

  const sid = opts.studioId?.trim();
  if (sid && UUID_RE.test(sid)) {
    where.studioId = sid;
  }

  const bs = opts.bookingStatus?.trim();
  if (bs && ADMIN_BOOKING_STATUSES.includes(bs as BookingStatus)) {
    where.bookingStatus = bs as BookingStatus;
  }

  const ps = opts.paymentStatus?.trim();
  if (ps && ADMIN_BOOKING_PAYMENT_STATUSES.includes(ps as BookingPaymentStatus)) {
    where.paymentStatus = ps as BookingPaymentStatus;
  }

  const q = opts.q?.trim();
  if (q) {
    where.OR = [
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { ticketRef: { contains: q, mode: "insensitive" } },
    ];
  }

  const from = parseDayUtc(opts.slotFrom);
  const to = parseDayUtc(opts.slotTo);
  if (from || to) {
    where.slot = {
      slotDate: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    };
  }

  return where;
}

const listInclude = {
  studio: { select: { id: true, displayName: true } },
  experience: { select: { id: true, title: true } },
  slot: true,
} satisfies Prisma.BookingInclude;

export type AdminBookingListRow = Prisma.BookingGetPayload<{ include: typeof listInclude }>;

export async function findAdminBookingsForList(opts: {
  studioId?: string | null;
  bookingStatus?: string | null;
  paymentStatus?: string | null;
  q?: string | null;
  slotFrom?: string | null;
  slotTo?: string | null;
  take?: number;
}): Promise<AdminBookingListRow[]> {
  const take = opts.take ?? 200;
  return prisma.booking.findMany({
    where: adminBookingsWhere(opts),
    orderBy: { createdAt: "desc" },
    take,
    include: listInclude,
  });
}

const detailInclude = {
  studio: { select: { id: true, displayName: true } },
  experience: { select: { id: true, title: true } },
  slot: true,
  customerUser: { select: { id: true, email: true } },
  orderItems: {
    include: {
      order: { select: { id: true, orderStatus: true, paymentStatus: true, createdAt: true } },
    },
  },
  cancellations: { orderBy: { createdAt: "desc" as const }, take: 10 },
  reschedules: {
    orderBy: { createdAt: "desc" as const },
    take: 10,
    include: {
      originalSlot: true,
      newSlot: true,
    },
  },
  auditLogs: {
    orderBy: { createdAt: "desc" as const },
    take: 100,
    include: {
      actorUser: { select: { id: true, email: true } },
    },
  },
} satisfies Prisma.BookingInclude;

export type AdminBookingDetail = Prisma.BookingGetPayload<{ include: typeof detailInclude }>;

export async function findAdminBookingById(id: string): Promise<AdminBookingDetail | null> {
  if (!UUID_RE.test(id)) return null;
  return prisma.booking.findUnique({
    where: { id },
    include: detailInclude,
  });
}
