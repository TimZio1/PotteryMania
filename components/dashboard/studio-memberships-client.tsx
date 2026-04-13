"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type ExperienceOption = { id: string; title: string };
type MembershipRow = {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  sessionsPerPeriod: number | null;
  maxFutureBookings: number | null;
  priceCents: number;
  recurringPriceCents: number | null;
  isRecurring: boolean;
  isActive: boolean;
  isVisible: boolean;
  sortOrder: number;
  experiences: { experienceId: string; experience: ExperienceOption }[];
  _count?: { purchases: number };
};

type MembershipForm = {
  name: string;
  description: string;
  durationDays: number;
  sessionsPerPeriod: string;
  maxFutureBookings: string;
  priceEur: string;
  recurringPriceEur: string;
  isRecurring: boolean;
  isActive: boolean;
  isVisible: boolean;
  sortOrder: number;
  experienceIds: string[];
};

function emptyForm(): MembershipForm {
  return {
    name: "",
    description: "",
    durationDays: 30,
    sessionsPerPeriod: "",
    maxFutureBookings: "",
    priceEur: "0.00",
    recurringPriceEur: "0.00",
    isRecurring: false,
    isActive: true,
    isVisible: true,
    sortOrder: 0,
    experienceIds: [],
  };
}

function formFromMembership(m: MembershipRow): MembershipForm {
  return {
    name: m.name,
    description: m.description ?? "",
    durationDays: m.durationDays,
    sessionsPerPeriod: m.sessionsPerPeriod != null ? String(m.sessionsPerPeriod) : "",
    maxFutureBookings: m.maxFutureBookings != null ? String(m.maxFutureBookings) : "",
    priceEur: (m.priceCents / 100).toFixed(2),
    recurringPriceEur: ((m.recurringPriceCents ?? 0) / 100).toFixed(2),
    isRecurring: m.isRecurring,
    isActive: m.isActive,
    isVisible: m.isVisible,
    sortOrder: m.sortOrder,
    experienceIds: m.experiences.map((link) => link.experienceId),
  };
}

export default function StudioMembershipsClient({
  studioId,
  experiences,
  initialMemberships,
}: {
  studioId: string;
  experiences: ExperienceOption[];
  initialMemberships: MembershipRow[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialMemberships);
  const [selectedId, setSelectedId] = useState<string | null>(initialMemberships[0]?.id ?? null);
  const [form, setForm] = useState<MembershipForm>(() => (initialMemberships[0] ? formFromMembership(initialMemberships[0]) : emptyForm()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const selected = useMemo(() => items.find((m) => m.id === selectedId) ?? null, [items, selectedId]);

  function openNew() {
    setSelectedId(null);
    setForm(emptyForm());
    setError(null);
    setOk(null);
  }

  function openExisting(m: MembershipRow) {
    setSelectedId(m.id);
    setForm(formFromMembership(m));
    setError(null);
    setOk(null);
  }

  function toggleExperience(experienceId: string) {
    setForm((current) => {
      const exists = current.experienceIds.includes(experienceId);
      return {
        ...current,
        experienceIds: exists ? current.experienceIds.filter((id) => id !== experienceId) : [...current.experienceIds, experienceId],
      };
    });
  }

  async function save() {
    if (!form.name.trim()) return setError("Membership name is required.");
    if (form.experienceIds.length === 0) return setError("Select at least one class.");
    const price = Number.parseFloat(form.priceEur.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) return setError("Enter a valid price.");
    const recurringPrice = Number.parseFloat(form.recurringPriceEur.replace(",", "."));

    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        durationDays: Math.max(1, Math.floor(form.durationDays)),
        sessionsPerPeriod: form.sessionsPerPeriod.trim() ? Math.max(1, Math.floor(Number(form.sessionsPerPeriod))) : null,
        maxFutureBookings: form.maxFutureBookings.trim() ? Math.max(1, Math.floor(Number(form.maxFutureBookings))) : null,
        priceCents: Math.round(price * 100),
        isRecurring: form.isRecurring,
        recurringPriceCents: form.isRecurring && Number.isFinite(recurringPrice) ? Math.max(0, Math.round(recurringPrice * 100)) : null,
        isActive: form.isActive,
        isVisible: form.isVisible,
        sortOrder: Math.max(0, Math.floor(form.sortOrder)),
        experienceIds: form.experienceIds,
      };

      if (!selectedId) {
        const res = await fetch(`/api/studios/${studioId}/memberships`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { error?: string; membership?: MembershipRow };
        if (!res.ok || !data.membership) throw new Error(data.error ?? "Could not create membership.");
        const next = [data.membership, ...items];
        setItems(next);
        setSelectedId(data.membership.id);
        setForm(formFromMembership(data.membership));
        setOk("Membership created.");
      } else {
        const res = await fetch(`/api/studios/${studioId}/memberships/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { error?: string; membership?: MembershipRow };
        if (!res.ok || !data.membership) throw new Error(data.error ?? "Could not update membership.");
        setItems((current) => current.map((m) => (m.id === selectedId ? data.membership! : m)));
        setForm(formFromMembership(data.membership));
        setOk("Membership updated.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!selectedId || !selected) return;
    if (!confirm(`Delete membership "${selected.name}"?`)) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/memberships/${selectedId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete membership.");
      const next = items.filter((m) => m.id !== selectedId);
      setItems(next);
      if (next[0]) {
        setSelectedId(next[0].id);
        setForm(formFromMembership(next[0]));
      } else {
        openNew();
      }
      setOk("Membership deleted.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <section className={`${ui.card} space-y-4`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={ui.overline}>Catalog</p>
            <h2 className="mt-1 text-lg font-semibold text-amber-950">Memberships</h2>
          </div>
          <button type="button" className={ui.buttonPrimary} onClick={openNew}>
            + New
          </button>
        </div>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">No memberships yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openExisting(item)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedId === item.id ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white hover:border-amber-200 hover:bg-stone-50"
                }`}
              >
                <p className="font-medium text-stone-900">{item.name}</p>
                <p className="mt-1 text-xs text-stone-500">
                  €{(item.priceCents / 100).toFixed(2)} · {item.durationDays} days · {item._count?.purchases ?? 0} members
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className={`${ui.card} space-y-5`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={ui.overline}>{selected ? "Edit" : "Create"}</p>
            <h2 className="mt-1 text-lg font-semibold text-amber-950">{selected ? selected.name : "New membership"}</h2>
          </div>
          {selected ? (
            <button type="button" className={ui.buttonGhost} onClick={removeSelected} disabled={busy}>
              Delete
            </button>
          ) : null}
        </div>

        {error ? <p className={ui.errorText}>{error}</p> : null}
        {ok ? <p className={ui.successText}>{ok}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className={ui.label}>Membership name</span>
            <input className={`${ui.input} mt-1`} value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className={ui.label}>Description</span>
            <textarea className={`${ui.input} mt-1 min-h-24`} value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Price (EUR)</span>
            <input className={`${ui.input} mt-1`} value={form.priceEur} onChange={(e) => setForm((c) => ({ ...c, priceEur: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Duration days</span>
            <input type="number" min={1} className={`${ui.input} mt-1`} value={form.durationDays} onChange={(e) => setForm((c) => ({ ...c, durationDays: Number(e.target.value) || 1 }))} />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Sessions per period (optional)</span>
            <input className={`${ui.input} mt-1`} value={form.sessionsPerPeriod} onChange={(e) => setForm((c) => ({ ...c, sessionsPerPeriod: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Max future bookings (optional)</span>
            <input className={`${ui.input} mt-1`} value={form.maxFutureBookings} onChange={(e) => setForm((c) => ({ ...c, maxFutureBookings: e.target.value }))} />
          </label>
        </div>

        <div className="grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm((c) => ({ ...c, isRecurring: e.target.checked }))} />
            Recurring
          </label>
          {form.isRecurring ? (
            <label className="block text-sm">
              <span className={ui.label}>Recurring price (EUR)</span>
              <input className={`${ui.input} mt-1`} value={form.recurringPriceEur} onChange={(e) => setForm((c) => ({ ...c, recurringPriceEur: e.target.value }))} />
            </label>
          ) : null}
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />
            Active
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm((c) => ({ ...c, isVisible: e.target.checked }))} />
            Visible publicly
          </label>
        </div>

        <div className="space-y-3">
          <p className={ui.label}>Included classes</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {experiences.map((experience) => {
              const checked = form.experienceIds.includes(experience.id);
              return (
                <label key={experience.id} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 p-2 text-sm text-stone-700">
                  <input type="checkbox" checked={checked} onChange={() => toggleExperience(experience.id)} />
                  <span>{experience.title}</span>
                </label>
              );
            })}
          </div>
        </div>

        <button type="button" className={ui.buttonPrimary} disabled={busy} onClick={save}>
          {busy ? "Saving..." : selected ? "Save membership" : "Create membership"}
        </button>
      </section>
    </div>
  );
}
