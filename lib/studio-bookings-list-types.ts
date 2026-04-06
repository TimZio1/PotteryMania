/** Serializable booking row for studio dashboard bookings UI (client-safe). */
export type StudioBookingListRow = {
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
  experience: { id: string; title: string };
  slot: { slotDate: string; startTime: string; endTime: string };
  createdAt: string;
  lastCancellation: {
    cancelledByRole: string;
    refundOutcome: string | null;
    createdAt: string;
  } | null;
};
