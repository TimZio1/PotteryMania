"use client";

import { useCallback, useEffect, useState } from "react";

type Block = { id: string; blockDate: string; note: string | null };

export function StudioClosedDaysSection({ studioId }: { studioId: string }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [err, setErr] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/studios/${studioId}/slots/block`);
    const j = await r.json();
    if (!r.ok) return;
    const raw = j.blocks || [];
    setBlocks(
      raw.map((b: { id: string; blockDate: string; note?: string | null }) => ({
        id: b.id,
        blockDate: typeof b.blockDate === "string" ? b.blockDate.slice(0, 10) : "",
        note: b.note ?? null,
      })),
    );
  }, [studioId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setErr("Pick a date first.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/studios/${studioId}/slots/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, note: note.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "We couldn’t save this closed day. Try again.");
        setBusy(false);
        return;
      }
      setNote("");
      await load();
    } catch {
      setErr("We couldn’t save this closed day. Try again.");
    }
    setBusy(false);
  }

  async function removeBlock(d: string) {
    setErr("");
    const r = await fetch(`/api/studios/${studioId}/slots/block`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: d }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr((j as { error?: string }).error || "We couldn’t remove this closed day. Try again.");
      return;
    }
    await load();
  }

  return (
    <section className="mb-10 rounded-lg border border-amber-200/60 bg-amber-50/30 p-4">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Days the studio is closed</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Pick a day you&apos;re closed (holiday, cleaning, travel). Nothing can be booked on that day, and we won&apos;t
        create new times on it.
      </p>
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      <form onSubmit={addBlock} className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="text-xs font-medium text-[var(--foreground)]">
          Date
          <input
            type="date"
            className="mt-1 block rounded border border-stone-300 bg-white px-2 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="min-w-[160px] flex-1 text-xs font-medium text-[var(--foreground)]">
          Reason (optional)
          <input
            className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Holiday, travel, cleaning…"
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-amber-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Mark day closed"}
        </button>
      </form>
      <ul className="mt-3 space-y-1 text-xs">
        {blocks.length === 0 ? (
          <li className="text-[var(--muted)]">No closed days yet.</li>
        ) : (
          blocks.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-white/80 px-2 py-1">
              <span>
                <strong>{b.blockDate}</strong>
                {b.note ? <span className="text-[var(--muted)]"> — {b.note}</span> : null}
              </span>
              <button type="button" className="text-amber-900 underline" onClick={() => removeBlock(b.blockDate)}>
                Reopen
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
