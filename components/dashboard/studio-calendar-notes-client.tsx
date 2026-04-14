"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type NoteRow = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  note: string;
};

export function StudioCalendarNotesClient({
  studioId,
  initialNotes,
}: {
  studioId: string;
  initialNotes: NoteRow[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    const res = await fetch(`/api/studios/${studioId}/calendar-notes`);
    const data = (await res.json()) as { items?: NoteRow[] };
    if (res.ok && data.items) setNotes(data.items);
  }

  async function createNote(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/calendar-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, note: text }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create note");
      setDate("");
      setText("");
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not create note");
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(id: string) {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/calendar-notes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not delete note");
      }
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not delete note");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      <form onSubmit={createNote} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="block">
          <span className={ui.label}>Date</span>
          <input type="date" className={`${ui.input} mt-1`} value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="block">
          <span className={ui.label}>Note</span>
          <textarea className={`${ui.input} mt-1 min-h-20`} value={text} onChange={(e) => setText(e.target.value)} required />
        </label>
        <button type="submit" disabled={busy} className={ui.buttonPrimary}>
          {busy ? "Saving..." : "Add note"}
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No notes in the current planning window.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--muted)]">
                  {note.date.slice(0, 10)} {note.startTime ? `${note.startTime}-${note.endTime ?? ""}` : "(all day)"}
                </p>
                <button type="button" className="text-xs font-medium text-red-400 hover:underline" onClick={() => void deleteNote(note.id)}>
                  Delete
                </button>
              </div>
              <p className="mt-1 text-sm text-[var(--foreground)]">{note.note}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
