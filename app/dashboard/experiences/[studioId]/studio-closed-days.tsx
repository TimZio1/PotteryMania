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
      setErr("Pick a date");
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
        setErr(j.error || "Could not block");
        setBusy(false);
        return;
      }
      setNote("");
      await load();
    } catch {
      setErr("Request failed");
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
      setErr((j as { error?: string }).error || "Remove failed");
      return;
    }
    await load();
  }

  return (
    <section className="mb-10 rounded-lg border border-amber-200/60 bg-amber-50/30 p-4">
      <h2 className="text-sm font-semibold text-amber-950">Studio closed days</h2>
      <p className="mt-1 text-xs text-stone-600">
        Block the whole studio on a calendar day. Open slots on that day are marked blocked; new slot generation skips
        these dates.
      </p>
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      <form onSubmit={addBlock} className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="text-xs font-medium text-stone-700">
          Date
          <input
            type="date"
            className="mt-1 block rounded border border-stone-300 bg-white px-2 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="min-w-[160px] flex-1 text-xs font-medium text-stone-700">
          Note (optional)
          <input
            className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Holiday, maintenance…"
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-amber-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "…" : "Block day"}
        </button>
      </form>
      <ul className="mt-3 space-y-1 text-xs">
        {blocks.length === 0 ? (
          <li className="text-stone-500">No blocked days.</li>
        ) : (
          blocks.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-white/80 px-2 py-1">
              <span>
                <strong>{b.blockDate}</strong>
                {b.note ? <span className="text-stone-600"> — {b.note}</span> : null}
              </span>
              <button type="button" className="text-amber-900 underline" onClick={() => removeBlock(b.blockDate)}>
                Remove
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
