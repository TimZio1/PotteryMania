"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ui } from "@/lib/ui-styles";

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

export function MyBookingsClient() {
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

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel(bookingId: string) {
    if (!confirm("Cancel this booking? Refunds follow the studio’s policy.")) return;
    setActionMsg("");
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Customer requested cancellation" }),
    });
    const data = await res.json();
    if (res.ok) {
      setActionMsg(`Cancelled. Refund outcome: ${data.refundOutcome}`);
      load();
    } else {
      setActionMsg(`Could not cancel: ${data.error}`);
    }
  }

  const isCancellable = (status: string) =>
    status === "pending" || status === "confirmed" || status === "awaiting_vendor_approval";

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-stone-500">Loading bookings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={ui.overline}>Bookings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">My bookings</h1>
          <p className="mt-2 text-sm text-stone-600">Classes and experiences you&apos;ve reserved.</p>
        </div>
        <Link href="/my-waitlist" className={`${ui.buttonSecondary} text-center sm:!w-auto`}>
          View waitlist
        </Link>
      </div>

      {actionMsg ? (
        <div className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {actionMsg}
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        {bookings.length === 0 ? (
          <div className={`${ui.cardMuted}`}>
            <p className="font-medium text-stone-800">No bookings yet</p>
            <p className="mt-2 text-sm text-stone-600">
              <Link href="/classes" className="font-medium text-amber-900 underline underline-offset-2">
                Browse classes
              </Link>{" "}
              to get started.
            </p>
          </div>
        ) : null}
        {bookings.map((b) => (
          <div key={b.id} className={ui.card}>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-stone-900">{b.experience.title}</p>
                <p className="mt-1 text-sm text-stone-500">{b.studio.displayName}</p>
                <p className="mt-2 text-sm text-stone-600">
                  {b.slot.slotDate.slice(0, 10)} · {b.slot.startTime}–{b.slot.endTime}
                </p>
                <p className="mt-1 text-sm text-stone-600">{b.participantCount} participants</p>
                {b.seatType ? <p className="mt-1 text-sm text-stone-600">Seat: {b.seatType}</p> : null}
                {b.ticketRef ? <p className="mt-2 text-sm font-medium text-amber-950">Ref: {b.ticketRef}</p> : null}
              </div>
              <div className="text-left sm:text-right">
                <p className="text-lg font-semibold text-amber-950">€{(b.totalAmountCents / 100).toFixed(2)}</p>
                {b.remainingBalanceCents > 0 ? (
                  <p className="mt-1 text-xs text-stone-500">
                    Paid online €{(b.depositAmountCents / 100).toFixed(2)} · Balance €
                    {(b.remainingBalanceCents / 100).toFixed(2)}
                  </p>
                ) : null}
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                  {b.bookingStatus} · {b.paymentStatus}
                </p>
                {b.cancellations.length > 0 ? (
                  <p className="mt-2 text-xs text-red-700">
                    Cancelled ({b.cancellations[0].cancelledByRole}) — {b.cancellations[0].refundOutcome}
                  </p>
                ) : null}
              </div>
            </div>
            {isCancellable(b.bookingStatus) ? (
              <div className="mt-5 border-t border-stone-100 pt-4">
                <button
                  type="button"
                  onClick={() => handleCancel(b.id)}
                  className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-800 transition hover:bg-red-50"
                >
                  Cancel booking
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
