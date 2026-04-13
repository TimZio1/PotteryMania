import type { StudioBookingListRow } from "@/lib/studio-bookings-list-types";
import { describeCancellationPolicySnapshot } from "@/lib/bookings/cancellation-policy";

type BookingWithRelations = {
  id: string;
  bookingStatus: string;
  paymentStatus: string;
  participantCount: number;
  seatType: string | null;
  totalAmountCents: number;
  depositAmountCents: number;
  remainingBalanceCents: number;
  depositPaidAt: Date | null;
  remainderPaidAt: Date | null;
  remainderPaymentLink: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  ticketRef: string | null;
  notes: string | null;
  cancellationPolicySnapshot: unknown;
  createdAt: Date;
  bookingAddOns: { addOnName: string; quantity: number; unitPriceCents: number }[];
  intakeResponses: { labelSnapshot: string; value: string; includeInInvoiceSnapshot: boolean }[];
  experience: { id: string; title: string };
  slot: { slotDate: Date; startTime: string; endTime: string };
  cancellations: { cancelledByRole: string; refundOutcome: string | null; createdAt: Date }[];
};

export function serializeStudioBookingsList(bookings: BookingWithRelations[]): StudioBookingListRow[] {
  return bookings.map((b) => {
    const c = b.cancellations[0];
    const cancellationPolicySnapshot =
      b.cancellationPolicySnapshot && typeof b.cancellationPolicySnapshot === "object"
        ? (b.cancellationPolicySnapshot as Record<string, unknown>)
        : null;
    return {
      id: b.id,
      bookingStatus: b.bookingStatus,
      paymentStatus: b.paymentStatus,
      participantCount: b.participantCount,
      seatType: b.seatType,
      totalAmountCents: b.totalAmountCents,
      depositAmountCents: b.depositAmountCents,
      remainingBalanceCents: b.remainingBalanceCents,
      depositPaidAt: b.depositPaidAt?.toISOString() ?? null,
      remainderPaidAt: b.remainderPaidAt?.toISOString() ?? null,
      remainderPaymentLink: b.remainderPaymentLink,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      customerPhone: b.customerPhone,
      ticketRef: b.ticketRef,
      notes: b.notes,
      cancellationPolicySummary: describeCancellationPolicySnapshot(cancellationPolicySnapshot),
      addOns: b.bookingAddOns.map((entry) => ({
        name: entry.addOnName,
        quantity: entry.quantity,
        unitPriceCents: entry.unitPriceCents,
      })),
      intakeResponses: b.intakeResponses.map((entry) => ({
        label: entry.labelSnapshot,
        value: entry.value,
        includeInInvoice: entry.includeInInvoiceSnapshot,
      })),
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
