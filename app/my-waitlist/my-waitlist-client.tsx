"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ui } from "@/lib/ui-styles";

type Entry = {
  id: string;
  status: string;
  participantCount: number;
  seatType: string | null;
  experience: { title: string };
  slot: { slotDate: string; startTime: string; endTime: string };
  studio: { displayName: string };
};

export function MyWaitlistClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/my-waitlist");
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-stone-500">Loading waitlist…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={ui.overline}>Waitlist</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">My waitlist</h1>
          <p className="mt-2 max-w-xl text-sm text-stone-600">
            These entries do not hold seats. If a spot opens, the studio may contact you.
          </p>
        </div>
        <Link href="/my-bookings" className={`${ui.buttonSecondary} text-center sm:!w-auto`}>
          My bookings
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className={`${ui.cardMuted} mt-8`}>
          <p className="font-medium text-stone-800">No waitlist entries</p>
          <p className="mt-2 text-sm text-stone-600">
            Join a waitlist from a class page when sessions are full.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {entries.map((e) => (
            <li key={e.id} className={ui.card}>
              <p className="font-semibold text-stone-900">{e.experience.title}</p>
              <p className="mt-1 text-sm text-stone-500">{e.studio.displayName}</p>
              <p className="mt-2 text-sm text-stone-600">
                {e.slot.slotDate.slice(0, 10)} · {e.slot.startTime}–{e.slot.endTime}
              </p>
              <p className="mt-2 text-sm text-stone-600">
                {e.participantCount} guests{e.seatType ? ` · ${e.seatType}` : ""} ·{" "}
                <span className="font-medium capitalize">{e.status}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
