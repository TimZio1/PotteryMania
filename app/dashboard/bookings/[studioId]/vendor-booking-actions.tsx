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
  const isCancellable = bookingStatus === "pending" || bookingStatus === "confirmed";

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

  if (!isCancellable) return null;

  return (
    <div className="mt-3 flex items-center gap-3 border-t border-stone-100 pt-3">
      <button
        onClick={handleCancel}
        className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
      >
        Cancel
      </button>
      {msg && <span className="text-xs text-stone-600">{msg}</span>}
    </div>
  );
}