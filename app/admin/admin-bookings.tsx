"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  bookingStatus: string;
  paymentStatus: string;
  participantCount: number;
  customerEmail: string;
  customerName: string;
  totalAmountCents: number;
  studio: { displayName: string };
  experience: { title: string };
  slot: { slotDate: string; startTime: string };
};

export function AdminBookings() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/admin/bookings");
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Failed to load");
        return;
      }
      setRows(j.bookings || []);
    })();
  }, []);

  if (err) return <p className="text-sm text-red-600">{err}</p>;

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold text-amber-950">Bookings</h2>
      <ul className="mt-4 divide-y divide-stone-200 rounded border border-stone-200 bg-white text-sm">
        {rows.map((b) => (
          <li key={b.id} className="px-3 py-2">
            <span className="font-medium">{b.experience.title}</span>
            <span className="text-stone-500"> · {b.studio.displayName}</span>
            <div className="text-xs text-stone-500">
              {b.customerName} ({b.customerEmail}) · {b.participantCount} pax · €
              {(b.totalAmountCents / 100).toFixed(2)} · {b.bookingStatus} / {b.paymentStatus}
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="mt-2 text-stone-500">No bookings yet.</p>}
    </div>
  );
}