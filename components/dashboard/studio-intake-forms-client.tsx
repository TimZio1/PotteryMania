"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type ExperienceOption = {
  id: string;
  title: string;
};

type IntakeFormItem = {
  id: string;
  title: string;
  fieldType: "text_single" | "text_multi" | "number" | "checkbox" | "dropdown" | "date" | "file_upload";
  isRequired: boolean;
  includeInInvoice: boolean;
  sortOrder: number;
  options: unknown;
  experienceIds: string[];
  linkedExperiences: ExperienceOption[];
};

type IntakeFormState = {
  title: string;
  fieldType: IntakeFormItem["fieldType"];
  isRequired: boolean;
  includeInInvoice: boolean;
  sortOrder: number;
  optionsText: string;
  experienceIds: string[];
};

function emptyForm(): IntakeFormState {
  return {
    title: "",
    fieldType: "text_single",
    isRequired: false,
    includeInInvoice: false,
    sortOrder: 0,
    optionsText: "",
    experienceIds: [],
  };
}

function formFromItem(item: IntakeFormItem): IntakeFormState {
  const options = Array.isArray(item.options)
    ? item.options.map((value) => (typeof value === "string" ? value : "")).filter(Boolean)
    : [];
  return {
    title: item.title,
    fieldType: item.fieldType,
    isRequired: item.isRequired,
    includeInInvoice: item.includeInInvoice,
    sortOrder: item.sortOrder,
    optionsText: options.join("\n"),
    experienceIds: item.experienceIds,
  };
}

function sortItems(items: IntakeFormItem[]): IntakeFormItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

function normalizeOptions(optionsText: string): string[] {
  return optionsText
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export default function StudioIntakeFormsClient({
  studioId,
  experiences,
  initialForms,
}: {
  studioId: string;
  experiences: ExperienceOption[];
  initialForms: IntakeFormItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(() => sortItems(initialForms));
  const [selectedId, setSelectedId] = useState<string | null>(initialForms[0]?.id ?? null);
  const [form, setForm] = useState<IntakeFormState>(() =>
    initialForms[0] ? formFromItem(initialForms[0]) : emptyForm(),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const needsOptions = form.fieldType === "dropdown";

  function openNew() {
    setSelectedId(null);
    setForm(emptyForm());
    setErr(null);
    setMsg(null);
  }

  function openExisting(item: IntakeFormItem) {
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
    if (!form.title.trim()) {
      setErr("Question title is required.");
      return;
    }

    const options = normalizeOptions(form.optionsText);
    if (needsOptions && options.length === 0) {
      setErr("Dropdown questions need at least one option.");
      return;
    }

    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const payload = {
        title: form.title.trim(),
        fieldType: form.fieldType,
        isRequired: form.isRequired,
        includeInInvoice: form.includeInInvoice,
        sortOrder: Math.max(0, Math.floor(form.sortOrder)),
        options: needsOptions ? options : null,
        experienceIds: form.experienceIds,
      };

      if (!selectedId) {
        const res = await fetch(`/api/studios/${studioId}/intake-forms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { error?: string; form?: IntakeFormItem };
        if (!res.ok || !data.form) {
          throw new Error(data.error ?? "Could not create booking question.");
        }
        const nextItems = sortItems([...items, data.form]);
        setItems(nextItems);
        setSelectedId(data.form.id);
        setForm(formFromItem(data.form));
        setMsg("Booking question created.");
        router.refresh();
        return;
      }

      const patchRes = await fetch(`/api/studios/${studioId}/intake-forms/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const patchData = (await patchRes.json()) as { error?: string; form?: IntakeFormItem };
      if (!patchRes.ok || !patchData.form) {
        throw new Error(patchData.error ?? "Could not update booking question.");
      }

      const linkRes = await fetch(`/api/studios/${studioId}/intake-forms/${selectedId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceIds: form.experienceIds }),
      });
      const linkData = (await linkRes.json()) as { error?: string; form?: IntakeFormItem };
      if (!linkRes.ok || !linkData.form) {
        throw new Error(linkData.error ?? "Could not update class assignments.");
      }

      const nextItems = sortItems(items.map((item) => (item.id === selectedId ? linkData.form! : item)));
      setItems(nextItems);
      setForm(formFromItem(linkData.form));
      setMsg("Booking question updated.");
      router.refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!selectedId || !selected) return;
    if (!confirm(`Delete "${selected.title}"?`)) return;

    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/intake-forms/${selectedId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not delete booking question.");
      }

      const nextItems = items.filter((item) => item.id !== selectedId);
      setItems(nextItems);
      if (nextItems[0]) {
        setSelectedId(nextItems[0].id);
        setForm(formFromItem(nextItems[0]));
      } else {
        openNew();
      }
      setMsg("Booking question deleted.");
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
            <p className={ui.overline}>Question bank</p>
            <h2 className="mt-1 text-lg font-semibold text-amber-950">Booking questions</h2>
            <p className="mt-2 text-sm text-stone-600">
              Collect notes, waivers, dates, selections, and file links during class booking.
            </p>
          </div>
          <button type="button" className={ui.buttonPrimary} onClick={openNew}>
            + New
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
            No booking questions yet. Add the questions you want customers to answer before checkout.
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
                      <p className="font-medium text-stone-900">{item.title}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {item.fieldType.replace(/_/g, " ")} · {item.isRequired ? "required" : "optional"}
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
              {selected ? selected.title : "New booking question"}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Questions appear on the booking form and are saved on the booking record for staff follow-up.
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
            <span className={ui.label}>Question title</span>
            <input
              className={`${ui.input} mt-1`}
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              placeholder="Preferred glaze color"
            />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Field type</span>
            <select
              className={`${ui.input} mt-1`}
              value={form.fieldType}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  fieldType: e.target.value as IntakeFormItem["fieldType"],
                  optionsText:
                    e.target.value === "dropdown" ? current.optionsText : "",
                }))
              }
            >
              <option value="text_single">Short text</option>
              <option value="text_multi">Long text</option>
              <option value="number">Number</option>
              <option value="checkbox">Checkbox / consent</option>
              <option value="dropdown">Dropdown</option>
              <option value="date">Date</option>
              <option value="file_upload">File link</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.isRequired}
              onChange={(e) => setForm((current) => ({ ...current, isRequired: e.target.checked }))}
            />
            Required
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.includeInInvoice}
              onChange={(e) => setForm((current) => ({ ...current, includeInInvoice: e.target.checked }))}
            />
            Include on invoice snapshot
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

        {needsOptions ? (
          <label className="block text-sm">
            <span className={ui.label}>Dropdown options</span>
            <textarea
              className={`${ui.input} mt-1 min-h-32`}
              value={form.optionsText}
              onChange={(e) => setForm((current) => ({ ...current, optionsText: e.target.value }))}
              placeholder={"One option per line\nBeginner\nIntermediate\nAdvanced"}
            />
            <span className="mt-1 block text-xs text-stone-500">One option per line.</span>
          </label>
        ) : form.fieldType === "file_upload" ? (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
            Customers can upload a JPG, PNG, or WebP image during booking, and they can still paste a hosted file URL if
            needed.
          </div>
        ) : null}

        <div>
          <p className={ui.label}>Ask on these classes</p>
          <p className="mt-1 text-xs text-stone-500">
            If you leave this empty, the question is available to assign later but will not show on public bookings yet.
          </p>
          {experiences.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
              Create at least one class before assigning booking questions.
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
            {busy ? "Saving..." : selected ? "Save question" : "Create question"}
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
