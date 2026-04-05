import { prisma } from "@/lib/db";
import type { BookingIcsRow } from "./booking-ics";

const select = {
  id: true,
  bookingStatus: true,
  participantCount: true,
  ticketRef: true,
  customerName: true,
  experience: {
    select: {
      title: true,
      durationMinutes: true,
      venueName: true,
      addressLine1: true,
      city: true,
      country: true,
    },
  },
  studio: {
    select: {
      displayName: true,
      addressLine1: true,
      city: true,
      country: true,
    },
  },
  slot: {
    select: {
      slotDate: true,
      startTime: true,
      endTime: true,
    },
  },
} as const;

export async function loadBookingIcsRowById(bookingId: string): Promise<BookingIcsRow | null> {
  const row = await prisma.booking.findUnique({
    where: { id: bookingId },
    select,
  });
  return row;
}

export async function loadCustomerBookingIcsRows(customerUserId: string, take = 200): Promise<BookingIcsRow[]> {
  return prisma.booking.findMany({
    where: { customerUserId },
    orderBy: { createdAt: "desc" },
    take,
    select,
  });
}
