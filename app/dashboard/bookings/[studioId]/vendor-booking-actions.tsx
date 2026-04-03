"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VendorBookingActions({
  bookingId,
  bookingStatus,
}: {
  bookingId: string;
  bookingStatus: string;
}) {
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const isCancellable =
    bookingStatus === "pending" || bookingStatus === "confirmed" || bookingStatus === "awaiting_vendor_approval";
  const needsApproval = bookingStatus === "awaiting_vendor_approval";

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

  if (!isCancellable && !needsApproval) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
      {needsApproval && (
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
      {isCancellable && (
        <button
          type="button"
          onClick={handleCancel}
          className="min-h-11 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
        >
          Cancel booking
        </button>
      )}
      {msg && <span className="block text-xs text-stone-600">{msg}</span>}
    </div>
  );
}
