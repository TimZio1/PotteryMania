"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type EditableStudio = {
  displayName: string;
  legalBusinessName: string;
  vatNumber: string;
  responsiblePersonName: string;
  email: string;
  phone: string | null;
  country: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  shortDescription: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
};

type Props = {
  studioId: string;
  initial: EditableStudio;
};

type FieldKey = keyof EditableStudio;

const FIELD_GROUPS: ReadonlyArray<{
  title: string;
  fields: ReadonlyArray<{ key: FieldKey; label: string; type?: "text" | "email" | "url" | "tel" | "textarea"; required?: boolean }>;
}> = [
  {
    title: "Identity",
    fields: [
      { key: "displayName", label: "Display name", required: true },
      { key: "legalBusinessName", label: "Legal business name", required: true },
      { key: "vatNumber", label: "VAT number", required: true },
      { key: "responsiblePersonName", label: "Responsible person", required: true },
    ],
  },
  {
    title: "Contact",
    fields: [
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "tel" },
    ],
  },
  {
    title: "Location",
    fields: [
      { key: "country", label: "Country", required: true },
      { key: "city", label: "City", required: true },
      { key: "addressLine1", label: "Address line 1", required: true },
      { key: "addressLine2", label: "Address line 2" },
      { key: "postalCode", label: "Postal code" },
    ],
  },
  {
    title: "Marketing",
    fields: [
      { key: "shortDescription", label: "Short description", type: "textarea" },
      { key: "websiteUrl", label: "Website", type: "url" },
      { key: "instagramUrl", label: "Instagram", type: "url" },
      { key: "facebookUrl", label: "Facebook", type: "url" },
    ],
  },
];

function normalizeFormValue(v: string | null | undefined): string {
  return typeof v === "string" ? v : "";
}

export function StudioAdminProfileEdit({ studioId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<Record<FieldKey, string>>(() => {
    const out = {} as Record<FieldKey, string>;
    (Object.keys(initial) as FieldKey[]).forEach((k) => {
      out[k] = normalizeFormValue(initial[k]);
    });
    return out;
  });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState<"ok" | "error" | "">("");

  function setField(key: FieldKey, v: string) {
    setForm((prev) => ({ ...prev, [key]: v }));
  }

  function buildDetailsPayload(): Record<string, string | null> {
    const out: Record<string, string | null> = {};
    (Object.keys(form) as FieldKey[]).forEach((k) => {
      const next = form[k].trim();
      const prev = normalizeFormValue(initial[k]);
      if (next === prev) return;
      out[k] = next.length === 0 ? null : next;
    });
    return out;
  }

  async function onSave() {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 8) {
      setMsg("Audit reason is required (minimum 8 characters).");
      setMsgKind("error");
      return;
    }
    const details = buildDetailsPayload();
    if (Object.keys(details).length === 0) {
      setMsg("No changes to save.");
      setMsgKind("error");
      return;
    }
    setBusy(true);
    setMsg("");
    setMsgKind("");
    try {
      const r = await fetch(`/api/admin/studios/${studioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details, reason: trimmedReason }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Save failed.");
        setMsgKind("error");
        return;
      }
      setMsg("Saved studio details.");
      setMsgKind("ok");
      setReason("");
      router.refresh();
    } catch {
      setMsg("Network error.");
      setMsgKind("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-900">Edit studio details</h3>
        <p className="text-xs text-stone-500">Audit-logged · admin only</p>
      </div>

      <div className="mt-4 space-y-6">
        {FIELD_GROUPS.map((group) => (
          <fieldset key={group.title} className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              {group.title}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.fields.map((f) => {
                const value = form[f.key];
                const idAttr = `studio-edit-${f.key}`;
                if (f.type === "textarea") {
                  return (
                    <label key={f.key} className="sm:col-span-2 block">
                      <span className={ui.label}>
                        {f.label}
                        {f.required ? " *" : ""}
                      </span>
                      <textarea
                        id={idAttr}
                        className={`${ui.input} mt-1 min-h-20`}
                        value={value}
                        onChange={(e) => setField(f.key, e.target.value)}
                        disabled={busy}
                      />
                    </label>
                  );
                }
                return (
                  <label key={f.key} className="block">
                    <span className={ui.label}>
                      {f.label}
                      {f.required ? " *" : ""}
                    </span>
                    <input
                      id={idAttr}
                      type={f.type ?? "text"}
                      className={`${ui.input} mt-1`}
                      value={value}
                      onChange={(e) => setField(f.key, e.target.value)}
                      disabled={busy}
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <label className="mt-6 block">
        <span className={ui.label}>Audit reason (min 8 chars)</span>
        <textarea
          className={`${ui.input} mt-1 min-h-20`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Studio owner requested correction of legal name and VAT."
          maxLength={500}
          disabled={busy}
        />
      </label>

      {msg ? (
        <p className={`mt-3 text-sm ${msgKind === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className={ui.buttonPrimary} onClick={onSave} disabled={busy}>
          {busy ? "Saving…" : "Save details"}
        </button>
      </div>
    </div>
  );
}
