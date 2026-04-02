"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Booking = {
  id: string;
  participantCount: number;
  bookingStatus: string;
  paymentStatus: string;
  totalAmountCents: number;
  depositAmountCents: number;
  remainingBalanceCents: number;
  ticketRef: string | null;
  seatType: string | null;
  experience: { id: string; title: string };
  slot: { slotDate: string; startTime: string; endTime: string; status: string };
  studio: { displayName: string };
  cancellations: { cancelledByRole: string; refundOutcome: string; createdAt: string }[];
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/my-bookings");
    if (res.ok) {
      const data = await res.json();
      setBookings(data.bookings);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(bookingId: string) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setActionMsg("");
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Customer requested cancellation" }),
    });
    const data = await res.json();
    if (res.ok) {
      setActionMsg(`Booking cancelled. Refund outcome: ${data.refundOutcome}`);
      load();
    } else {
      setActionMsg(`Error: ${data.error}`);
    }
  }

  const isCancellable = (status: string) =>
    status === "pending" || status === "confirmed" || status === "awaiting_vendor_approval";

  if (loading) return <p className="p-10 text-stone-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-amber-950">My Bookings</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/my-waitlist" className="text-amber-800">
            My waitlist
          </Link>
          <Link href="/" className="text-stone-600">
            Home
          </Link>
        </div>
      </div>

      {actionMsg && (
        <div className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {actionMsg}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {bookings.length === 0 && <p className="text-stone-500">No bookings yet.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="rounded-lg border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-stone-900">{b.experience.title}</p>
                <p className="text-sm text-stone-500">{b.studio.displayName}</p>
                <p className="text-sm text-stone-500">
                  {b.slot.slotDate.slice(0, 10)} at {b.slot.startTime}-{b.slot.endTime}
                </p>
                <p className="text-sm text-stone-500">{b.participantCount} participants</p>
                {b.seatType ? <p className="text-sm text-stone-500">Seat: {b.seatType}</p> : null}
                {b.ticketRef ? (
                  <p className="text-sm font-medium text-amber-900">Reference: {b.ticketRef}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-medium text-stone-900">
                  &euro;{(b.totalAmountCents / 100).toFixed(2)}
                  {b.remainingBalanceCents > 0 ? (
                    <span className="block text-xs font-normal text-stone-500">
                      Paid online: €{(b.depositAmountCents / 100).toFixed(2)} · Balance: €
                      {(b.remainingBalanceCents / 100).toFixed(2)}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-stone-500">{b.bookingStatus} / {b.paymentStatus}</p>
                {b.cancellations.length > 0 && (
                  <p className="text-xs text-red-600">
                    Cancelled by {b.cancellations[0].cancelledByRole} — {b.cancellations[0].refundOutcome}
                  </p>
                )}
              </div>
            </div>
            {isCancellable(b.bookingStatus) && (
              <div className="mt-3 border-t border-stone-100 pt-3">
                <button
                  onClick={() => handleCancel(b.id)}
                  className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Cancel Booking
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}