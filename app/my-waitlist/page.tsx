"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Entry = {
  id: string;
  status: string;
  participantCount: number;
  seatType: string | null;
  experience: { title: string };
  slot: { slotDate: string; startTime: string; endTime: string };
  studio: { displayName: string };
};

export default function MyWaitlistPage() {
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

  if (loading) return <p className="p-10 text-stone-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-amber-950">My waitlist</h1>
        <Link href="/my-bookings" className="text-sm text-amber-800">
          My bookings
        </Link>
      </div>
      <p className="mt-2 text-sm text-stone-600">
        These entries do not reserve seats. You&apos;ll be contacted if a spot opens.
      </p>
      <ul className="mt-6 space-y-3">
        {entries.map((e) => (
          <li key={e.id} className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
            <p className="font-medium">{e.experience.title}</p>
            <p className="text-stone-500">{e.studio.displayName}</p>
            <p className="text-stone-500">
              {e.slot.slotDate.slice(0, 10)} {e.slot.startTime}–{e.slot.endTime}
            </p>
            <p className="text-stone-600">
              {e.participantCount} pax{e.seatType ? ` · ${e.seatType}` : ""} · {e.status}
            </p>
          </li>
        ))}
      </ul>
      {entries.length === 0 && <p className="mt-6 text-stone-500">No waitlist entries.</p>}
    </div>
  );
}
