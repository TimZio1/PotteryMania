"use client";

import { useState } from "react";

export type SlotOption = {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacityTotal: number;
  capacityReserved: number;
};

export function ClassBookingForm(props: {
  minP: number;
  maxP: number;
  priceCents: number;
  slots: SlotOption[];
}) {
  const [slotId, setSlotId] = useState(props.slots[0]?.id ?? "");
  const [participantCount, setParticipantCount] = useState(props.minP);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          participantCount,
          customerName,
          customerEmail,
          customerPhone: customerPhone || undefined,
          notes: notes || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Checkout failed");
        return;
      }
      if (j.url) window.location.href = j.url;
      else setErr("No checkout URL");
    } finally {
      setLoading(false);
    }
  }

  if (props.slots.length === 0) {
    return <p className="text-sm text-stone-500">No open slots in this window. Check back later.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="text-lg font-medium text-amber-950">Book</h2>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <label className="block text-sm">
        <span className="text-stone-600">Session</span>
        <select
          className="mt-1 w-full rounded border px-3 py-2"
          value={slotId}
          onChange={(e) => setSlotId(e.target.value)}
        >
          {props.slots.map((s) => {
            const left = s.capacityTotal - s.capacityReserved;
            const day = s.slotDate.slice(0, 10);
            return (
              <option key={s.id} value={s.id}>
                {day} {s.startTime}–{s.endTime} ({left} seats left)
              </option>
            );
          })}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-stone-600">Participants ({props.minP}–{props.maxP})</span>
        <input
          type="number"
          min={props.minP}
          max={props.maxP}
          className="mt-1 w-full rounded border px-3 py-2"
          value={participantCount}
          onChange={(e) => setParticipantCount(Number(e.target.value))}
        />
      </label>
      <p className="text-sm text-stone-600">
        Total: €{((props.priceCents * participantCount) / 100).toFixed(2)}
      </p>
      <label className="block text-sm">
        <span className="text-stone-600">Your name</span>
        <input
          required
          className="mt-1 w-full rounded border px-3 py-2"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-stone-600">Email</span>
        <input
          required
          type="email"
          className="mt-1 w-full rounded border px-3 py-2"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-stone-600">Phone (optional)</span>
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-stone-600">Notes (optional)</span>
        <textarea
          className="mt-1 w-full rounded border px-3 py-2"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={loading || !slotId}
        className="w-full rounded bg-amber-800 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Redirecting…" : "Continue to payment"}
      </button>
    </form>
  );
}