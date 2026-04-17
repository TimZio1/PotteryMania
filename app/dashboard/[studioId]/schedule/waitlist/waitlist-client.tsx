"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type Entry = {
  id: string;
  customerName: string;
  customerEmail: string;
  participantCount: number;
  createdAt: string;
  experienceTitle: string;
  slotDate: string | null;
  slotTime: string | null;
  slotStatus: string | null;
};

export function WaitlistClient({ studioId, entries: initial }: { studioId: string; entries: Entry[] }) {
  const [entries, setEntries] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function dismiss(id: string) {
    if (busy) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/studios/${studioId}/waitlist/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } finally {
      setBusy(null);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white px-5 py-8 text-center">
        <p className="text-sm text-[var(--muted)]">No active waitlist entries right now.</p>
        <p className="mt-1 text-xs text-stone-400">When your classes fill up, customers can join the waitlist and they will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">{entries.length} active {entries.length === 1 ? "entry" : "entries"}</p>
      <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
        {entries.map((e) => (
          <div key={e.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-stone-900">{e.customerName}</p>
              <p className="text-sm text-[var(--muted)]">{e.customerEmail}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {e.experienceTitle}
                {e.slotDate ? ` · ${e.slotDate}` : ""}
                {e.slotTime ? ` at ${e.slotTime}` : ""}
                {" · "}{e.participantCount} {e.participantCount === 1 ? "person" : "people"}
              </p>
              <p className="mt-0.5 text-xs text-stone-400">
                Joined {new Date(e.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={`mailto:${e.customerEmail}?subject=A spot opened up!&body=Hi ${encodeURIComponent(e.customerName)},%0A%0AA spot has opened in ${encodeURIComponent(e.experienceTitle)}. Would you like to book?`}
                className={ui.buttonPrimary}
              >
                Email
              </a>
              <button
                onClick={() => dismiss(e.id)}
                disabled={busy === e.id}
                className={ui.buttonGhost}
              >
                {busy === e.id ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
