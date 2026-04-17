"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type FieldType = "text_single" | "text_multi" | "number" | "checkbox" | "dropdown" | "date" | "file_upload";

type FieldRow = {
  id: string;
  title: string;
  fieldType: FieldType;
  isRequired: boolean;
  options: unknown;
  sortOrder: number;
};

type FormState = {
  title: string;
  fieldType: FieldType;
  isRequired: boolean;
  sortOrder: number;
  optionsText: string;
};

function emptyForm(): FormState {
  return {
    title: "",
    fieldType: "text_single",
    isRequired: false,
    sortOrder: 0,
    optionsText: "",
  };
}

function formFromField(field: FieldRow): FormState {
  const options = Array.isArray(field.options) ? field.options.filter((entry): entry is string => typeof entry === "string") : [];
  return {
    title: field.title,
    fieldType: field.fieldType,
    isRequired: field.isRequired,
    sortOrder: field.sortOrder,
    optionsText: options.join("\n"),
  };
}

function parseOptions(optionsText: string): string[] {
  return [...new Set(optionsText.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean))];
}

export default function StudioClientFieldsClient({
  studioId,
  initialFields,
}: {
  studioId: string;
  initialFields: FieldRow[];
}) {
  const router = useRouter();
  const [fields, setFields] = useState(initialFields);
  const [selectedId, setSelectedId] = useState<string | null>(initialFields[0]?.id ?? null);
  const [form, setForm] = useState<FormState>(initialFields[0] ? formFromField(initialFields[0]) : emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const selected = useMemo(() => fields.find((entry) => entry.id === selectedId) ?? null, [fields, selectedId]);

  function openNew() {
    setSelectedId(null);
    setForm(emptyForm());
    setError(null);
    setOk(null);
  }

  function openField(field: FieldRow) {
    setSelectedId(field.id);
    setForm(formFromField(field));
    setError(null);
    setOk(null);
  }

  async function save() {
    if (!form.title.trim()) {
      setError("Field title is required.");
      return;
    }
    const options = form.fieldType === "dropdown" ? parseOptions(form.optionsText) : null;
    if (form.fieldType === "dropdown" && (!options || options.length === 0)) {
      setError("Dropdown fields require at least one option.");
      return;
    }

    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const payload = {
        title: form.title.trim(),
        fieldType: form.fieldType,
        isRequired: form.isRequired,
        sortOrder: form.sortOrder,
        options,
      };

      if (!selectedId) {
        const res = await fetch(`/api/studios/${studioId}/client-fields`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { error?: string; field?: FieldRow };
        if (!res.ok || !data.field) throw new Error(data.error ?? "Could not create field.");
        const next = [...fields, data.field].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
        setFields(next);
        setSelectedId(data.field.id);
        setForm(formFromField(data.field));
        setOk("Field created.");
        router.refresh();
        return;
      }

      const res = await fetch(`/api/studios/${studioId}/client-fields/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; field?: FieldRow };
      if (!res.ok || !data.field) throw new Error(data.error ?? "Could not update field.");
      const next = fields
        .map((entry) => (entry.id === selectedId ? data.field! : entry))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
      setFields(next);
      setForm(formFromField(data.field));
      setOk("Field updated.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!selectedId || !selected) return;
    if (!confirm(`Delete "${selected.title}"?`)) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/client-fields/${selectedId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete field.");
      const next = fields.filter((entry) => entry.id !== selectedId);
      setFields(next);
      if (next[0]) openField(next[0]);
      else openNew();
      setOk("Field deleted.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <section className={ui.card}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={ui.overline}>Profile field list</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Client fields</h2>
          </div>
          <button type="button" className={ui.buttonPrimary} onClick={openNew}>
            + New
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {fields.map((field) => (
            <button
              key={field.id}
              type="button"
              onClick={() => openField(field)}
              className={`w-full rounded-xl border p-3 text-left ${
                field.id === selectedId
                  ? "border-amber-300 bg-amber-50"
                  : "border-stone-200 bg-white hover:border-amber-200 hover:bg-stone-50"
              }`}
            >
              <p className="font-medium text-stone-900">{field.title}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {field.fieldType.replace(/_/g, " ")} · {field.isRequired ? "required" : "optional"}
              </p>
            </button>
          ))}
          {fields.length === 0 ? <p className="text-sm text-[var(--muted)]">No client profile fields yet.</p> : null}
        </div>
      </section>

      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{selected ? `Edit: ${selected.title}` : "New client field"}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className={ui.label}>Field title</span>
            <input className={`${ui.input} mt-1`} value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Field type</span>
            <select
              className={`${ui.input} mt-1`}
              value={form.fieldType}
              onChange={(e) => setForm((c) => ({ ...c, fieldType: e.target.value as FieldType }))}
            >
              <option value="text_single">Short text</option>
              <option value="text_multi">Long text</option>
              <option value="number">Number</option>
              <option value="checkbox">Checkbox</option>
              <option value="dropdown">Dropdown</option>
              <option value="date">Date</option>
              <option value="file_upload">File URL</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm((c) => ({ ...c, isRequired: e.target.checked }))} />
            Required field
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Sort order</span>
            <input
              type="number"
              min={0}
              className={`${ui.input} mt-1`}
              value={form.sortOrder}
              onChange={(e) => setForm((c) => ({ ...c, sortOrder: Math.max(0, Number(e.target.value) || 0) }))}
            />
          </label>
        </div>
        {form.fieldType === "dropdown" ? (
          <label className="mt-4 block text-sm">
            <span className={ui.label}>Dropdown options (one per line)</span>
            <textarea
              className={`${ui.input} mt-1 min-h-28`}
              value={form.optionsText}
              onChange={(e) => setForm((c) => ({ ...c, optionsText: e.target.value }))}
            />
          </label>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className={ui.buttonPrimary} onClick={save} disabled={busy}>
            {busy ? "Saving..." : selected ? "Save field" : "Create field"}
          </button>
          {selected ? (
            <button type="button" className={ui.buttonGhost} onClick={removeSelected} disabled={busy}>
              Delete
            </button>
          ) : null}
        </div>
        {error ? <p className={`${ui.errorText} mt-3`}>{error}</p> : null}
        {ok ? <p className={`${ui.successText} mt-3`}>{ok}</p> : null}
      </section>
    </div>
  );
}
