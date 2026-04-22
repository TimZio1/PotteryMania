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
  const [err, setErr] = useState("");

  async function dismiss(id: string, name: string) {
    if (busy) return;
    if (!window.confirm(`Remove ${name} from the waitlist?`)) return;
    setBusy(id);
    setErr("");
    try {
      const res = await fetch(`/api/studios/${studioId}/waitlist/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      } else {
        setErr("We couldn’t remove this entry. Try again.");
      }
    } catch {
      setErr("We couldn’t remove this entry. Try again.");
    } finally {
      setBusy(null);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white px-5 py-8 text-center">
        <p className="text-sm text-[var(--muted)]">Nobody is waiting right now.</p>
        <p className="mt-1 text-xs text-stone-400">When a class fills up, guests can join the waitlist here. You&apos;ll be able to reach out as soon as a seat opens.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      <p className="text-sm text-[var(--muted)]">
        {entries.length === 1 ? "1 person waiting" : `${entries.length} people waiting`}
      </p>
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
                href={`mailto:${e.customerEmail}?subject=${encodeURIComponent(`A seat opened in ${e.experienceTitle}`)}&body=${encodeURIComponent(`Hi ${e.customerName},\n\nA seat just opened in ${e.experienceTitle}. If you'd still like to join, reply to this email or book directly and we'll hold it for you.\n\nThanks!`)}`}
                className={ui.buttonPrimary}
              >
                Email this guest
              </a>
              <button
                onClick={() => dismiss(e.id, e.customerName)}
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
