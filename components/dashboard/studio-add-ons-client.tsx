"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type ExperienceOption = {
  id: string;
  title: string;
};

type AddOnItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  durationMinutesExtra: number;
  isActive: boolean;
  isSelectedByDefault: boolean;
  sortOrder: number;
  maxPerBooking: number;
  experienceIds: string[];
  linkedExperiences: ExperienceOption[];
};

type AddOnFormState = {
  name: string;
  description: string;
  imageUrl: string;
  priceEur: string;
  durationMinutesExtra: number;
  isActive: boolean;
  isSelectedByDefault: boolean;
  sortOrder: number;
  maxPerBooking: number;
  experienceIds: string[];
};

function emptyForm(): AddOnFormState {
  return {
    name: "",
    description: "",
    imageUrl: "",
    priceEur: "0.00",
    durationMinutesExtra: 0,
    isActive: true,
    isSelectedByDefault: false,
    sortOrder: 0,
    maxPerBooking: 1,
    experienceIds: [],
  };
}

function formFromItem(item: AddOnItem): AddOnFormState {
  return {
    name: item.name,
    description: item.description ?? "",
    imageUrl: item.imageUrl ?? "",
    priceEur: (item.priceCents / 100).toFixed(2),
    durationMinutesExtra: item.durationMinutesExtra,
    isActive: item.isActive,
    isSelectedByDefault: item.isSelectedByDefault,
    sortOrder: item.sortOrder,
    maxPerBooking: item.maxPerBooking,
    experienceIds: item.experienceIds,
  };
}

function sortItems(items: AddOnItem[]): AddOnItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export default function StudioAddOnsClient({
  studioId,
  experiences,
  initialAddOns,
}: {
  studioId: string;
  experiences: ExperienceOption[];
  initialAddOns: AddOnItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(() => sortItems(initialAddOns));
  const [selectedId, setSelectedId] = useState<string | null>(initialAddOns[0]?.id ?? null);
  const [form, setForm] = useState<AddOnFormState>(() =>
    initialAddOns[0] ? formFromItem(initialAddOns[0]) : emptyForm(),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  function openNew() {
    setSelectedId(null);
    setForm(emptyForm());
    setErr(null);
    setMsg(null);
  }

  function openExisting(item: AddOnItem) {
    setSelectedId(item.id);
    setForm(formFromItem(item));
    setErr(null);
    setMsg(null);
  }

  function toggleExperience(experienceId: string) {
    setForm((current) => ({
      ...current,
      experienceIds: current.experienceIds.includes(experienceId)
        ? current.experienceIds.filter((id) => id !== experienceId)
        : [...current.experienceIds, experienceId],
    }));
  }

  async function save() {
    const price = Number.parseFloat(form.priceEur.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) {
      setErr("Enter a valid add-on price.");
      return;
    }
    if (!form.name.trim()) {
      setErr("Add-on name is required.");
      return;
    }

    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        priceCents: Math.round(price * 100),
        currency: "EUR",
        durationMinutesExtra: Math.max(0, Math.floor(form.durationMinutesExtra)),
        isActive: form.isActive,
        isSelectedByDefault: form.isSelectedByDefault,
        sortOrder: Math.max(0, Math.floor(form.sortOrder)),
        maxPerBooking: Math.max(1, Math.floor(form.maxPerBooking)),
        experienceIds: form.experienceIds,
      };

      if (!selectedId) {
        const res = await fetch(`/api/studios/${studioId}/add-ons`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { error?: string; addOn?: AddOnItem };
        if (!res.ok || !data.addOn) {
          throw new Error(data.error ?? "Could not create add-on.");
        }
        const nextItems = sortItems([...items, data.addOn]);
        setItems(nextItems);
        setSelectedId(data.addOn.id);
        setForm(formFromItem(data.addOn));
        setMsg("Add-on created.");
        router.refresh();
        return;
      }

      const patchRes = await fetch(`/api/studios/${studioId}/add-ons/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const patchData = (await patchRes.json()) as { error?: string; addOn?: AddOnItem };
      if (!patchRes.ok || !patchData.addOn) {
        throw new Error(patchData.error ?? "Could not update add-on.");
      }

      const linkRes = await fetch(`/api/studios/${studioId}/add-ons/${selectedId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceIds: form.experienceIds }),
      });
      const linkData = (await linkRes.json()) as { error?: string; addOn?: AddOnItem };
      if (!linkRes.ok || !linkData.addOn) {
        throw new Error(linkData.error ?? "Could not update class assignments.");
      }

      const nextItems = sortItems(items.map((item) => (item.id === selectedId ? linkData.addOn! : item)));
      setItems(nextItems);
      setForm(formFromItem(linkData.addOn));
      setMsg("Add-on updated.");
      router.refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!selectedId || !selected) return;
    if (!confirm(`Delete "${selected.name}"?`)) return;

    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/add-ons/${selectedId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not delete add-on.");
      }

      const nextItems = items.filter((item) => item.id !== selectedId);
      setItems(nextItems);
      if (nextItems[0]) {
        setSelectedId(nextItems[0].id);
        setForm(formFromItem(nextItems[0]));
      } else {
        openNew();
      }
      setMsg("Add-on deleted.");
      router.refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Delete failed.");
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
            <h2 className="mt-1 text-lg font-semibold text-amber-950">Add-ons</h2>
            <p className="mt-2 text-sm text-stone-600">
              Optional booking extras like premium clay, glazing, gift wrap, or firing upgrades.
            </p>
          </div>
          <button type="button" className={ui.buttonPrimary} onClick={openNew}>
            + New
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
            No add-ons yet. Create your first optional extra for class bookings.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openExisting(item)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-amber-300 bg-amber-50"
                      : "border-stone-200 bg-white hover:border-amber-200 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900">{item.name}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {item.isActive ? "Active" : "Hidden"} · +€{(item.priceCents / 100).toFixed(2)}
                      </p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">
                      {item.linkedExperiences.length} class{item.linkedExperiences.length === 1 ? "" : "es"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className={`${ui.card} space-y-5`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={ui.overline}>{selected ? "Edit" : "Create"}</p>
            <h2 className="mt-1 text-lg font-semibold text-amber-950">
              {selected ? selected.name : "New class add-on"}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Assign add-ons to one or more classes. Customers see them during booking and the selection is saved on the
              reservation.
            </p>
          </div>
          {selected ? (
            <button type="button" className={ui.buttonGhost} onClick={openNew}>
              New form
            </button>
          ) : null}
        </div>

        {err ? <p className={ui.errorText}>{err}</p> : null}
        {msg ? <p className="text-sm font-medium text-emerald-700">{msg}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className={ui.label}>Name</span>
            <input
              className={`${ui.input} mt-1`}
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              placeholder="Premium glazing"
            />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Price (EUR)</span>
            <input
              className={`${ui.input} mt-1`}
              value={form.priceEur}
              onChange={(e) => setForm((current) => ({ ...current, priceEur: e.target.value }))}
              placeholder="8.00"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className={ui.label}>Description</span>
          <textarea
            className={`${ui.input} mt-1 min-h-24`}
            value={form.description}
            onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
            placeholder="Describe what the customer gets with this upgrade."
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className={ui.label}>Image URL</span>
            <input
              className={`${ui.input} mt-1`}
              value={form.imageUrl}
              onChange={(e) => setForm((current) => ({ ...current, imageUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Extra minutes</span>
            <input
              type="number"
              min={0}
              className={`${ui.input} mt-1`}
              value={form.durationMinutesExtra}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  durationMinutesExtra: Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Max per booking</span>
            <input
              type="number"
              min={1}
              max={99}
              className={`${ui.input} mt-1`}
              value={form.maxPerBooking}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  maxPerBooking: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                }))
              }
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.checked }))}
            />
            Active and bookable
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.isSelectedByDefault}
              onChange={(e) => setForm((current) => ({ ...current, isSelectedByDefault: e.target.checked }))}
            />
            Preselect by default
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Sort order</span>
            <input
              type="number"
              min={0}
              className={`${ui.input} mt-1`}
              value={form.sortOrder}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  sortOrder: Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                }))
              }
            />
          </label>
        </div>

        <div>
          <p className={ui.label}>Visible on these classes</p>
          <p className="mt-1 text-xs text-stone-500">
            If you leave this empty, the add-on is saved but will not appear in public booking yet.
          </p>
          {experiences.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
              Create at least one class before assigning add-ons.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {experiences.map((experience) => (
                <label
                  key={experience.id}
                  className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
                >
                  <input
                    type="checkbox"
                    checked={form.experienceIds.includes(experience.id)}
                    onChange={() => toggleExperience(experience.id)}
                  />
                  <span>{experience.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-4">
          <button type="button" className={ui.buttonPrimary} disabled={busy} onClick={save}>
            {busy ? "Saving..." : selected ? "Save add-on" : "Create add-on"}
          </button>
          {selected ? (
            <button type="button" className={ui.buttonGhost} disabled={busy} onClick={removeSelected}>
              Delete
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
