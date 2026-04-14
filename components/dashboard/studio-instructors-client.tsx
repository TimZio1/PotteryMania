"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type InstructorRow = {
  id: string;
  name: string;
  bio: string | null;
  isActive: boolean;
  experiences: { experience: { title: string } }[];
};

export function StudioInstructorsClient({
  studioId,
  initialInstructors,
}: {
  studioId: string;
  initialInstructors: InstructorRow[];
}) {
  const [instructors, setInstructors] = useState(initialInstructors);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    const res = await fetch(`/api/studios/${studioId}/instructors?includeInactive=1`);
    const data = (await res.json()) as { items?: InstructorRow[] };
    if (res.ok && data.items) setInstructors(data.items);
  }

  async function createInstructor(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/instructors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio: bio || null }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create instructor");
      setName("");
      setBio("");
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not create instructor");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: InstructorRow) {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/instructors/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not update instructor");
      }
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not update instructor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      <form onSubmit={createInstructor} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="block">
          <span className={ui.label}>Instructor name</span>
          <input className={`${ui.input} mt-1`} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className={ui.label}>Bio (optional)</span>
          <textarea className={`${ui.input} mt-1 min-h-20`} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        <button type="submit" disabled={busy} className={ui.buttonPrimary}>
          {busy ? "Saving..." : "Add instructor"}
        </button>
      </form>

      {instructors.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No instructors configured.</p>
      ) : (
        <ul className="space-y-3">
          {instructors.map((instructor) => (
            <li key={instructor.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[var(--foreground)]">{instructor.name}</p>
                <button type="button" className="text-xs font-medium text-[var(--accent)] underline" onClick={() => void toggleActive(instructor)}>
                  {instructor.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
              {instructor.bio ? <p className="mt-1 text-sm text-[var(--muted)]">{instructor.bio}</p> : null}
              <p className="mt-2 text-xs text-[var(--muted)]">
                Classes: {instructor.experiences.map((link) => link.experience.title).join(", ") || "None"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
