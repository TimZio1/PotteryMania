import type { StudioBookingListRow } from "@/lib/studio-bookings-list-types";

type BookingWithRelations = {
  id: string;
  bookingStatus: string;
  paymentStatus: string;
  participantCount: number;
  seatType: string | null;
  totalAmountCents: number;
  depositAmountCents: number;
  remainingBalanceCents: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  ticketRef: string | null;
  createdAt: Date;
  experience: { id: string; title: string };
  slot: { slotDate: Date; startTime: string; endTime: string };
  cancellations: { cancelledByRole: string; refundOutcome: string | null; createdAt: Date }[];
};

export function serializeStudioBookingsList(bookings: BookingWithRelations[]): StudioBookingListRow[] {
  return bookings.map((b) => {
    const c = b.cancellations[0];
    return {
      id: b.id,
      bookingStatus: b.bookingStatus,
      paymentStatus: b.paymentStatus,
      participantCount: b.participantCount,
      seatType: b.seatType,
      totalAmountCents: b.totalAmountCents,
      depositAmountCents: b.depositAmountCents,
      remainingBalanceCents: b.remainingBalanceCents,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      customerPhone: b.customerPhone,
      ticketRef: b.ticketRef,
      experience: b.experience,
      slot: {
        slotDate: b.slot.slotDate.toISOString(),
        startTime: b.slot.startTime,
        endTime: b.slot.endTime,
      },
      createdAt: b.createdAt.toISOString(),
      lastCancellation: c
        ? {
            cancelledByRole: c.cancelledByRole,
            refundOutcome: c.refundOutcome,
            createdAt: c.createdAt.toISOString(),
          }
        : null,
    };
  });
}
