"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type SlotOption = {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacityTotal: number;
  capacityReserved: number;
  seatPoolKeys: string[];
};

export type WaitlistSlotOption = SlotOption;

export function ClassBookingForm(props: {
  minP: number;
  maxP: number;
  priceCents: number;
  bookingDepositBps: number;
  slots: SlotOption[];
  waitlistSlots: WaitlistSlotOption[];
}) {
  const [slotId, setSlotId] = useState(props.slots[0]?.id ?? "");
  const [participantCount, setParticipantCount] = useState(props.minP);
  const [seatType, setSeatType] = useState<string>("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const [wlSlotId, setWlSlotId] = useState(props.waitlistSlots[0]?.id ?? "");
  const [wlParticipants, setWlParticipants] = useState(props.minP);
  const [wlName, setWlName] = useState("");
  const [wlEmail, setWlEmail] = useState("");
  const [wlSeatType, setWlSeatType] = useState("");
  const [wlErr, setWlErr] = useState("");
  const [wlOk, setWlOk] = useState("");
  const [wlLoading, setWlLoading] = useState(false);

  const selectedSlot = useMemo(
    () => props.slots.find((s) => s.id === slotId),
    [props.slots, slotId]
  );
  const seatKeys = selectedSlot?.seatPoolKeys ?? [];
  const wlSelected = useMemo(
    () => props.waitlistSlots.find((s) => s.id === wlSlotId),
    [props.waitlistSlots, wlSlotId]
  );
  const wlSeatKeys = wlSelected?.seatPoolKeys ?? [];

  const fullLineCents = props.priceCents * participantCount;
  const depositPct = props.bookingDepositBps / 100;
  const dueNowCents =
    props.bookingDepositBps > 0
      ? Math.min(fullLineCents, Math.max(1, Math.ceil((fullLineCents * props.bookingDepositBps) / 10_000)))
      : fullLineCents;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setAdded(false);
    setLoading(true);
    try {
      const body: Record<string, unknown> = { slotId, participantCount };
      if (seatKeys.length) body.seatType = seatType;
      const r = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  async function onWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setWlErr("");
    setWlOk("");
    setWlLoading(true);
    try {
      const body: Record<string, unknown> = {
        slotId: wlSlotId,
        participantCount: wlParticipants,
        customerName: wlName,
        customerEmail: wlEmail,
      };
      if (wlSeatKeys.length) body.seatType = wlSeatType;
      const r = await fetch("/api/bookings/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setWlErr(j.error || "Could not join waitlist");
        return;
      }
      setWlOk(
        j.message === "Added to waitlist"
          ? "You've been added to the waitlist. You can check your status from your account."
          : j.message || "You've been added to the waitlist. You can check your status from your account."
      );
    } finally {
      setWlLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {props.slots.length === 0 ? (
        <p className="text-sm text-stone-500">No open sessions with enough seats in this window.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-stone-200 bg-white p-4">
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
          {seatKeys.length > 0 && (
            <label className="block text-sm">
              <span className="text-stone-600">Seat type</span>
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={seatType}
                onChange={(e) => setSeatType(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {seatKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="text-stone-600">
              Participants ({props.minP}–{props.maxP})
            </span>
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
            Experience total: €{(fullLineCents / 100).toFixed(2)}
            {props.bookingDepositBps > 0 ? (
              <>
                {" "}
                · Due at checkout (deposit {depositPct.toFixed(1)}%): €{(dueNowCents / 100).toFixed(2)}
              </>
            ) : null}
          </p>
          <p className="text-sm text-stone-500">
            Add this class to your cart, then complete one checkout for products and bookings from the same studio.
          </p>
          <button
            type="submit"
            disabled={loading || !slotId || (seatKeys.length > 0 && !seatType)}
            className="w-full rounded bg-amber-800 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Adding…" : "Add class to cart"}
          </button>
        </form>
      )}

      {props.waitlistSlots.length > 0 && (
        <form onSubmit={onWaitlist} className="space-y-4 rounded-lg border border-dashed border-amber-300 bg-amber-50/40 p-4">
          <h2 className="text-lg font-medium text-amber-950">Join waitlist</h2>
          <p className="text-sm text-stone-600">
            No seats available for your group right now. You can join the waitlist. No payment is taken and no seat is
            reserved.
          </p>
          {wlErr && <p className="text-sm text-red-600">{wlErr}</p>}
          {wlOk && <p className="text-sm text-green-800">{wlOk}</p>}
          <label className="block text-sm">
            <span className="text-stone-600">Session</span>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={wlSlotId}
              onChange={(e) => setWlSlotId(e.target.value)}
            >
              {props.waitlistSlots.map((s) => {
                const left = s.capacityTotal - s.capacityReserved;
                const day = s.slotDate.slice(0, 10);
                return (
                  <option key={s.id} value={s.id}>
                    {day} {s.startTime}–{s.endTime} ({left} left)
                  </option>
                );
              })}
            </select>
          </label>
          {wlSeatKeys.length > 0 && (
            <label className="block text-sm">
              <span className="text-stone-600">Seat type</span>
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={wlSeatType}
                onChange={(e) => setWlSeatType(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {wlSeatKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="text-stone-600">Participants</span>
            <input
              type="number"
              min={props.minP}
              max={props.maxP}
              className="mt-1 w-full rounded border px-3 py-2"
              value={wlParticipants}
              onChange={(e) => setWlParticipants(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Name</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={wlName}
              onChange={(e) => setWlName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Email</span>
            <input
              type="email"
              className="mt-1 w-full rounded border px-3 py-2"
              value={wlEmail}
              onChange={(e) => setWlEmail(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={
              wlLoading ||
              !wlSlotId ||
              (wlSeatKeys.length > 0 && !wlSeatType) ||
              !wlName.trim() ||
              !wlEmail.trim()
            }
            className="w-full rounded border border-amber-800 bg-white py-2 text-amber-950 disabled:opacity-50"
          >
            {wlLoading ? "Joining…" : "Join waitlist"}
          </button>
        </form>
      )}
    </div>
  );
}
