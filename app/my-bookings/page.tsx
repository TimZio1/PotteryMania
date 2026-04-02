"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Booking = {
  id: string;
  participantCount: number;
  bookingStatus: string;
  paymentStatus: string;
  totalAmountCents: number;
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

  const isCancellable = (status: string) => status === "pending" || status === "confirmed";

  if (loading) return <p className="p-10 text-stone-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-amber-950">My Bookings</h1>
        <Link href="/" className="text-sm text-amber-800">Home</Link>
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
              </div>
              <div className="text-right">
                <p className="font-medium text-stone-900">
                  &euro;{(b.totalAmountCents / 100).toFixed(2)}
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