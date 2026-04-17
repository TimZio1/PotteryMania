"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type Rule = {
  id: string;
  name: string;
  daysAfterVisit: number;
  emailSubject: string;
  emailBody: string;
  experienceIds: string[];
  isActive: boolean;
};

type Experience = { id: string; title: string };

type FormState = {
  name: string;
  daysAfterVisit: number;
  emailSubject: string;
  emailBody: string;
  experienceIds: string[];
  isActive: boolean;
};

function emptyForm(): FormState {
  return {
    name: "",
    daysAfterVisit: 14,
    emailSubject: "Time for your next pottery class, {{customerName}}?",
    emailBody:
      "<p>Hi {{customerName}},</p><p>It has been {{daysAfterVisit}} days since your last class at {{studioName}}. Ready to book another session?</p>",
    experienceIds: [],
    isActive: true,
  };
}

function formFromRule(rule: Rule): FormState {
  return {
    name: rule.name,
    daysAfterVisit: rule.daysAfterVisit,
    emailSubject: rule.emailSubject,
    emailBody: rule.emailBody,
    experienceIds: rule.experienceIds,
    isActive: rule.isActive,
  };
}

export default function StudioBookSoonClient({
  studioId,
  rules,
  experiences,
}: {
  studioId: string;
  rules: Rule[];
  experiences: Experience[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(rules);
  const [selectedId, setSelectedId] = useState<string | null>(rules[0]?.id ?? null);
  const [form, setForm] = useState<FormState>(rules[0] ? formFromRule(rules[0]) : emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const selected = useMemo(() => items.find((entry) => entry.id === selectedId) ?? null, [items, selectedId]);

  function openRule(rule: Rule) {
    setSelectedId(rule.id);
    setForm(formFromRule(rule));
    setError(null);
    setOk(null);
  }

  function openNew() {
    setSelectedId(null);
    setForm(emptyForm());
    setError(null);
    setOk(null);
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
    if (!form.name.trim()) {
      setError("Rule name is required.");
      return;
    }
    if (!form.emailSubject.trim() || !form.emailBody.trim()) {
      setError("Email subject and body are required.");
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const payload = {
        name: form.name.trim(),
        daysAfterVisit: Math.max(1, Math.floor(form.daysAfterVisit)),
        emailSubject: form.emailSubject.trim(),
        emailBody: form.emailBody.trim(),
        experienceIds: form.experienceIds,
        isActive: form.isActive,
      };

      if (!selectedId) {
        const res = await fetch(`/api/studios/${studioId}/book-soon`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { error?: string; rule?: Rule };
        if (!res.ok || !data.rule) throw new Error(data.error ?? "Could not create rule.");
        setItems((current) => [data.rule!, ...current]);
        setSelectedId(data.rule.id);
        setForm(formFromRule(data.rule));
        setOk("Rule created.");
        router.refresh();
        return;
      }

      const res = await fetch(`/api/studios/${studioId}/book-soon/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; rule?: Rule };
      if (!res.ok || !data.rule) throw new Error(data.error ?? "Could not update rule.");
      setItems((current) => current.map((entry) => (entry.id === selectedId ? data.rule! : entry)));
      setForm(formFromRule(data.rule));
      setOk("Rule updated.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!selectedId || !selected) return;
    if (!confirm(`Delete rule "${selected.name}"?`)) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/book-soon/${selectedId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete rule.");
      const next = items.filter((entry) => entry.id !== selectedId);
      setItems(next);
      if (next[0]) openRule(next[0]);
      else openNew();
      setOk("Rule deleted.");
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
            <p className={ui.overline}>Rules</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Follow-up campaigns</h2>
          </div>
          <button type="button" className={ui.buttonPrimary} onClick={openNew}>
            + New
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {items.map((rule) => {
            const active = rule.id === selectedId;
            return (
              <button
                key={rule.id}
                type="button"
                onClick={() => openRule(rule)}
                className={`w-full rounded-xl border p-3 text-left ${
                  active ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white hover:border-amber-200 hover:bg-stone-50"
                }`}
              >
                <p className="font-medium text-stone-900">{rule.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {rule.daysAfterVisit} day delay · {rule.isActive ? "active" : "inactive"}
                </p>
              </button>
            );
          })}
          {items.length === 0 ? <p className="text-sm text-[var(--muted)]">No rules yet.</p> : null}
        </div>
      </section>

      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{selected ? `Edit: ${selected.name}` : "New reminder rule"}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className={ui.label}>Rule name</span>
            <input className={`${ui.input} mt-1`} value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Days after class</span>
            <input
              type="number"
              min={1}
              max={365}
              className={`${ui.input} mt-1`}
              value={form.daysAfterVisit}
              onChange={(e) => setForm((c) => ({ ...c, daysAfterVisit: Math.max(1, Number(e.target.value) || 1) }))}
            />
          </label>
        </div>
        <label className="mt-4 block text-sm">
          <span className={ui.label}>Email subject</span>
          <input className={`${ui.input} mt-1`} value={form.emailSubject} onChange={(e) => setForm((c) => ({ ...c, emailSubject: e.target.value }))} />
        </label>
        <label className="mt-4 block text-sm">
          <span className={ui.label}>Email body HTML</span>
          <textarea
            className={`${ui.input} mt-1 min-h-32`}
            value={form.emailBody}
            onChange={(e) => setForm((c) => ({ ...c, emailBody: e.target.value }))}
          />
        </label>
        <div className="mt-2 text-xs text-[var(--muted)]">
          Supported variables: <code>{"{{customerName}}"}</code>, <code>{"{{studioName}}"}</code>, <code>{"{{className}}"}</code>, <code>{"{{lastVisitDate}}"}</code>
        </div>
        <div className="mt-4">
          <p className={ui.label}>Restrict to classes (optional)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {experiences.map((experience) => (
              <label key={experience.id} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.experienceIds.includes(experience.id)}
                  onChange={() => toggleExperience(experience.id)}
                />
                <span>{experience.title}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />
          Rule is active
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className={ui.buttonPrimary} onClick={save} disabled={busy}>
            {busy ? "Saving..." : selected ? "Save rule" : "Create rule"}
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
