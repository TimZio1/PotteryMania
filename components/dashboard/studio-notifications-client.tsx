"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type ExperienceOption = { id: string; title: string };
type TemplateType =
  | "booking_confirmation"
  | "booking_reminder"
  | "booking_cancellation"
  | "booking_rescheduled"
  | "review_request"
  | "book_soon";

type TemplateRow = {
  id: string;
  templateType: TemplateType;
  experienceId: string | null;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
  experience: ExperienceOption | null;
};

type ChannelSettings = {
  smsEnabled: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  whatsappNotificationsEnabled: boolean;
  whatsappNumber: string;
};

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  booking_confirmation: "Booking confirmation",
  booking_reminder: "Booking reminder",
  booking_cancellation: "Booking cancellation",
  booking_rescheduled: "Booking rescheduled",
  review_request: "Review request",
  book_soon: "Book soon reminder",
};

export default function StudioNotificationsClient({
  studioId,
  experiences,
  initialTemplates,
  initialChannels,
}: {
  studioId: string;
  experiences: ExperienceOption[];
  initialTemplates: TemplateRow[];
  initialChannels: ChannelSettings;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [channels, setChannels] = useState(initialChannels);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({
    templateType: "booking_confirmation" as TemplateType,
    experienceId: "",
    subject: "",
    bodyHtml: "",
    isActive: true,
    id: "",
  });

  const selected = useMemo(() => templates.find((t) => t.id === form.id) ?? null, [templates, form.id]);

  function loadTemplate(template: TemplateRow) {
    setForm({
      id: template.id,
      templateType: template.templateType,
      experienceId: template.experienceId ?? "",
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      isActive: template.isActive,
    });
    setError(null);
    setOk(null);
  }

  function resetForm() {
    setForm({
      id: "",
      templateType: "booking_confirmation",
      experienceId: "",
      subject: "",
      bodyHtml: "",
      isActive: true,
    });
    setError(null);
    setOk(null);
  }

  async function saveTemplate() {
    if (!form.subject.trim()) return setError("Subject is required.");
    if (!form.bodyHtml.trim()) return setError("Template body is required.");
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const payload = {
        templateType: form.templateType,
        experienceId: form.experienceId || null,
        subject: form.subject.trim(),
        bodyHtml: form.bodyHtml.trim(),
        isActive: form.isActive,
      };
      if (!form.id) {
        const res = await fetch(`/api/studios/${studioId}/notification-templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { error?: string; template?: TemplateRow };
        if (!res.ok || !data.template) throw new Error(data.error ?? "Could not create template.");
        setTemplates((current) => [data.template!, ...current]);
        loadTemplate(data.template);
        setOk("Template created.");
      } else {
        const res = await fetch(`/api/studios/${studioId}/notification-templates/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { error?: string; template?: TemplateRow };
        if (!res.ok || !data.template) throw new Error(data.error ?? "Could not update template.");
        setTemplates((current) => current.map((t) => (t.id === form.id ? data.template! : t)));
        loadTemplate(data.template);
        setOk("Template updated.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeTemplate() {
    if (!form.id || !selected) return;
    if (!confirm(`Delete template "${selected.subject}"?`)) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/notification-templates/${form.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete template.");
      setTemplates((current) => current.filter((t) => t.id !== form.id));
      resetForm();
      setOk("Template deleted.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveChannels() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/notification-channels`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(channels),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update channels.");
      setOk("Notification channels updated.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Channel update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">SMS and WhatsApp channels</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="checkbox" checked={channels.smsEnabled} onChange={(e) => setChannels((c) => ({ ...c, smsEnabled: e.target.checked }))} />
            Enable SMS notifications
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={channels.whatsappNotificationsEnabled}
              onChange={(e) => setChannels((c) => ({ ...c, whatsappNotificationsEnabled: e.target.checked }))}
            />
            Enable WhatsApp notifications
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Twilio Account SID</span>
            <input className={`${ui.input} mt-1`} value={channels.twilioAccountSid} onChange={(e) => setChannels((c) => ({ ...c, twilioAccountSid: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Twilio phone number</span>
            <input className={`${ui.input} mt-1`} value={channels.twilioPhoneNumber} onChange={(e) => setChannels((c) => ({ ...c, twilioPhoneNumber: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Twilio auth token (optional)</span>
            <input className={`${ui.input} mt-1`} value={channels.twilioAuthToken} onChange={(e) => setChannels((c) => ({ ...c, twilioAuthToken: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>WhatsApp number</span>
            <input className={`${ui.input} mt-1`} value={channels.whatsappNumber} onChange={(e) => setChannels((c) => ({ ...c, whatsappNumber: e.target.value }))} />
          </label>
        </div>
        <button type="button" className={`${ui.buttonPrimary} mt-4`} disabled={busy} onClick={saveChannels}>
          Save channels
        </button>
      </section>

      <section className={ui.card}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Notification templates</h2>
          <button type="button" className={ui.buttonSecondary} onClick={resetForm}>
            New template
          </button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {templates.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No templates yet.</p>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => loadTemplate(template)}
                  className={`w-full rounded-xl border p-3 text-left ${
                    form.id === template.id ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white hover:bg-stone-50"
                  }`}
                >
                  <p className="text-sm font-medium text-stone-900">{template.subject}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {TEMPLATE_LABELS[template.templateType]}
                    {template.experience ? ` · ${template.experience.title}` : " · all classes"}
                  </p>
                </button>
              ))
            )}
          </div>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className={ui.label}>Template type</span>
                <select
                  className={`${ui.input} mt-1`}
                  value={form.templateType}
                  onChange={(e) => setForm((c) => ({ ...c, templateType: e.target.value as TemplateType }))}
                >
                  {(Object.keys(TEMPLATE_LABELS) as TemplateType[]).map((key) => (
                    <option key={key} value={key}>
                      {TEMPLATE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className={ui.label}>Class (optional)</span>
                <select className={`${ui.input} mt-1`} value={form.experienceId} onChange={(e) => setForm((c) => ({ ...c, experienceId: e.target.value }))}>
                  <option value="">All classes</option>
                  {experiences.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className={ui.label}>Subject</span>
              <input className={`${ui.input} mt-1`} value={form.subject} onChange={(e) => setForm((c) => ({ ...c, subject: e.target.value }))} />
            </label>
            <label className="block text-sm">
              <span className={ui.label}>Body HTML (supports template variables like customerName, className, studioName)</span>
              <textarea className={`${ui.input} mt-1 min-h-40`} value={form.bodyHtml} onChange={(e) => setForm((c) => ({ ...c, bodyHtml: e.target.value }))} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />
              Active
            </label>
            <div className="flex gap-3">
              <button type="button" className={ui.buttonPrimary} disabled={busy} onClick={saveTemplate}>
                {form.id ? "Save template" : "Create template"}
              </button>
              {form.id ? (
                <button type="button" className={ui.buttonGhost} disabled={busy} onClick={removeTemplate}>
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {error ? <p className={ui.errorText}>{error}</p> : null}
      {ok ? <p className={ui.successText}>{ok}</p> : null}
    </div>
  );
}
