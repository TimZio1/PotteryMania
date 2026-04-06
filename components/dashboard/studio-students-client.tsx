"use client";

import { useCallback, useMemo, useState } from "react";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";
import type { StudentCrmRow } from "@/lib/studio-student-crm";

export default function StudioStudentsClient({
  studioId,
  initialStudents,
}: {
  studioId: string;
  initialStudents: StudentCrmRow[];
}) {
  const [students, setStudents] = useState(initialStudents);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [selected, setSelected] = useState<StudentCrmRow | null>(null);
  const [panelForm, setPanelForm] = useState({
    displayName: "",
    email: "",
    phone: "",
    notes: "",
    tags: "",
  });
  const [addForm, setAddForm] = useState({
    displayName: "",
    email: "",
    phone: "",
    notes: "",
    tags: "",
  });
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const st of students) for (const t of st.tags) s.add(t);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [students]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const tf = tagFilter.trim().toLowerCase();
    return students.filter((st) => {
      if (tf && !st.tags.some((t) => t.toLowerCase() === tf)) return false;
      if (!qq) return true;
      return (
        st.displayName.toLowerCase().includes(qq) ||
        st.email.toLowerCase().includes(qq) ||
        (st.phone?.toLowerCase().includes(qq) ?? false)
      );
    });
  }, [students, q, tagFilter]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/studios/${studioId}/contacts`);
    const data = (await res.json()) as { students?: StudentCrmRow[]; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Refresh failed");
    if (data.students) setStudents(data.students);
  }, [studioId]);

  function openRow(st: StudentCrmRow) {
    setSelected(st);
    setPanelForm({
      displayName: st.displayName,
      email: st.email,
      phone: st.phone ?? "",
      notes: st.notes ?? "",
      tags: st.tags.join(", "),
    });
    setErr(null);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setErr(null);
    try {
      if (selected.contactId) {
        const res = await fetch(`/api/studios/${studioId}/contacts/${selected.contactId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: panelForm.displayName,
            email: panelForm.email,
            phone: panelForm.phone.trim() || null,
            notes: panelForm.notes.trim() || null,
            tags: panelForm.tags,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Save failed");
      } else {
        const res = await fetch(`/api/studios/${studioId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: panelForm.email,
            displayName: panelForm.displayName,
            phone: panelForm.phone.trim() || undefined,
            notes: panelForm.notes.trim() || undefined,
            tags: panelForm.tags,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Save failed");
      }
      await refresh();
      setSelected(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setErr(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addForm.email,
          displayName: addForm.displayName || addForm.email.split("@")[0] || "Guest",
          phone: addForm.phone.trim() || undefined,
          notes: addForm.notes.trim() || undefined,
          tags: addForm.tags,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not add");
      await refresh();
      setAddForm({ displayName: "", email: "", phone: "", notes: "", tags: "" });
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Add failed");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="relative grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        {err ? <p className="text-sm text-rose-700">{err}</p> : null}

        <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50/95 p-4 backdrop-blur sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[180px] flex-1">
            <span className={ui.label}>Search</span>
            <input
              className={cn(ui.input, "mt-1")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, phone…"
            />
          </label>
          <label className="block w-full min-w-[140px] sm:w-44">
            <span className={ui.label}>Tag</span>
            <select className={cn(ui.input, "mt-1")} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="">All tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Attended</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Last session</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                    No rows match filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.emailNormalized}
                    className={cn(
                      "cursor-pointer border-b border-stone-100 last:border-0 hover:bg-amber-50/50",
                      selected?.emailNormalized === r.emailNormalized && "bg-amber-50",
                    )}
                    onClick={() => openRow(r)}
                  >
                    <td className="px-4 py-3 font-medium text-stone-900">{r.displayName}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {r.email}
                      {r.phone ? (
                        <>
                          <br />
                          <span className="text-xs">{r.phone}</span>
                        </>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{r.bookingCount}</td>
                    <td className="px-4 py-3 text-stone-600">{r.attendedCount}</td>
                    <td className="px-4 py-3 text-xs text-stone-600">
                      {r.tags.length ? r.tags.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {r.lastSessionDate ?? "—"}
                      {r.lastClassTitle ? (
                        <>
                          <br />
                          <span className="text-xs">{r.lastClassTitle}</span>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={cn(ui.cardMuted, "space-y-3")}>
          <p className="text-sm font-semibold text-amber-950">Add contact manually</p>
          <form onSubmit={addManual} className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className={ui.label}>Email</span>
              <input
                className={cn(ui.input, "mt-1")}
                type="email"
                required
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="student@example.com"
              />
            </label>
            <label>
              <span className={ui.label}>Name</span>
              <input
                className={cn(ui.input, "mt-1")}
                value={addForm.displayName}
                onChange={(e) => setAddForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Display name"
              />
            </label>
            <label>
              <span className={ui.label}>Phone</span>
              <input
                className={cn(ui.input, "mt-1")}
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className={ui.label}>Tags (comma-separated)</span>
              <input
                className={cn(ui.input, "mt-1")}
                value={addForm.tags}
                onChange={(e) => setAddForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="VIP, beginner"
              />
            </label>
            <label className="sm:col-span-2">
              <span className={ui.label}>Notes</span>
              <textarea
                className={cn(ui.input, "mt-1 min-h-[72px]")}
                value={addForm.notes}
                onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <button type="submit" disabled={adding} className={cn(ui.buttonPrimary, "sm:col-span-2")}>
              {adding ? "Saving…" : "Add contact"}
            </button>
          </form>
        </div>
      </div>

      {selected ? (
        <aside
          className={cn(
            ui.card,
            "lg:sticky lg:top-20 h-fit space-y-4 border-amber-200/80 shadow-md max-lg:fixed max-lg:inset-x-4 max-lg:bottom-4 max-lg:z-20 max-lg:max-h-[85vh] overflow-y-auto",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500">Edit</p>
              <p className="mt-1 text-sm text-stone-600">
                {selected.contactId ? "Saved profile" : "From bookings — save to add notes & tags"}
              </p>
            </div>
            <button type="button" className={ui.buttonGhost} onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <label>
            <span className={ui.label}>Name</span>
            <input
              className={cn(ui.input, "mt-1")}
              value={panelForm.displayName}
              onChange={(e) => setPanelForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </label>
          <label>
            <span className={ui.label}>Email</span>
            <input
              className={cn(ui.input, "mt-1")}
              type="email"
              value={panelForm.email}
              onChange={(e) => setPanelForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label>
            <span className={ui.label}>Phone</span>
            <input
              className={cn(ui.input, "mt-1")}
              value={panelForm.phone}
              onChange={(e) => setPanelForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label>
            <span className={ui.label}>Tags (comma-separated)</span>
            <input
              className={cn(ui.input, "mt-1")}
              value={panelForm.tags}
              onChange={(e) => setPanelForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </label>
          <label>
            <span className={ui.label}>Notes</span>
            <textarea
              className={cn(ui.input, "mt-1 min-h-[100px]")}
              value={panelForm.notes}
              onChange={(e) => setPanelForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          <button type="button" disabled={saving} onClick={() => void save()} className={cn(ui.buttonPrimary, "w-full")}>
            {saving ? "Saving…" : "Save"}
          </button>
          <dl className="border-t border-stone-100 pt-3 text-xs text-stone-500">
            <div className="flex justify-between gap-2">
              <dt>Bookings</dt>
              <dd>{selected.bookingCount}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Attended (completed)</dt>
              <dd>{selected.attendedCount}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Participants (sum)</dt>
              <dd>{selected.participantsTotal}</dd>
            </div>
          </dl>
        </aside>
      ) : null}
    </div>
  );
}
