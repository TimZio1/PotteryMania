"use client";

import Link from "next/link";
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
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setAdded(false);
    setLoading(true);
    try {
      const r = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          participantCount,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Could not add class");
        return;
      }
      setAdded(true);
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
      {added && (
        <p className="text-sm text-stone-600">
          Class added to cart.{" "}
          <Link href="/cart" className="text-amber-800 underline">
            Go to checkout
          </Link>
        </p>
      )}
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
      <p className="text-sm text-stone-500">
        Add this class to your cart, then complete one checkout for products and bookings from the same studio.
      </p>
      <button
        type="submit"
        disabled={loading || !slotId}
        className="w-full rounded bg-amber-800 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Adding…" : "Add class to cart"}
      </button>
    </form>
  );
}