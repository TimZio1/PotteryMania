"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { isReschedulable } from "@/lib/bookings/status";
import { RescheduleBookingPanel } from "@/components/bookings/reschedule-booking-panel";

export default function VendorBookingActions({
  bookingId,
  bookingStatus,
  participantCount,
  seatType,
}: {
  bookingId: string;
  bookingStatus: string;
  participantCount: number;
  seatType?: string | null;
}) {
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const isCancellable =
    bookingStatus === "pending" || bookingStatus === "confirmed" || bookingStatus === "awaiting_vendor_approval";
  const needsApproval = bookingStatus === "awaiting_vendor_approval";
  const canMarkCompleted = bookingStatus === "confirmed";

  async function handleCancel() {
    if (!confirm("Cancel this booking? The customer will be notified.")) return;
    setMsg("");
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Vendor cancelled" }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`Cancelled. Refund: ${data.refundOutcome}`);
      router.refresh();
    } else {
      setMsg(`Error: ${data.error}`);
    }
  }

  async function handleApprove() {
    setMsg("");
    const res = await fetch(`/api/bookings/${bookingId}/vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Approved.");
      router.refresh();
    } else {
      setMsg(`Error: ${data.error}`);
    }
  }

  async function handleReject() {
    const reason = prompt("Optional note to the customer (decline reason):") ?? "";
    if (reason === null) return;
    setMsg("");
    const res = await fetch(`/api/bookings/${bookingId}/vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reason }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Declined. Customer notified.");
      router.refresh();
    } else {
      setMsg(`Error: ${data.error}`);
    }
  }

  async function handleMarkCompleted() {
    if (!confirm("Mark this booking as completed (attended)?")) return;
    setMsg("");
    const res = await fetch(`/api/bookings/${bookingId}/vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_completed" }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Marked completed.");
      router.refresh();
    } else {
      setMsg(`Error: ${data.error}`);
    }
  }

  const showBlock = needsApproval || isCancellable || canMarkCompleted;
  const showReschedule = isReschedulable(bookingStatus as BookingStatus);

  return (
    <div className="space-y-2">
      <a
        href={`/api/bookings/${bookingId}/calendar`}
        className="inline-block text-xs font-medium text-amber-900 underline underline-offset-2"
      >
        Calendar (.ics)
      </a>
      {showBlock || showReschedule ? (
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
          {showBlock && needsApproval && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApprove}
                className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="min-h-11 rounded-lg bg-stone-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
              >
                Decline
              </button>
            </div>
          )}
          {showBlock && canMarkCompleted && (
            <button
              type="button"
              onClick={handleMarkCompleted}
              className="min-h-11 rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-900"
            >
              Mark as attended / completed
            </button>
          )}
          {showBlock && isCancellable && (
            <button
              type="button"
              onClick={handleCancel}
              className="min-h-11 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Cancel booking
            </button>
          )}
          {showBlock && msg ? <span className="block text-xs text-stone-600">{msg}</span> : null}
          {showReschedule ? (
            <RescheduleBookingPanel
              bookingId={bookingId}
              bookingStatus={bookingStatus}
              participantCount={participantCount}
              seatType={seatType}
              onSuccess={() => router.refresh()}
              className={showBlock ? "!border-t-0 !pt-3" : "!border-t-0 !pt-0"}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
