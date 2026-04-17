"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";

const DEFAULT_HOURS: { day: string; from: string; to: string; closed: boolean }[] = [
  { day: "Monday", from: "10:00", to: "21:00", closed: false },
  { day: "Tuesday", from: "10:00", to: "21:00", closed: false },
  { day: "Wednesday", from: "10:00", to: "21:00", closed: false },
  { day: "Thursday", from: "10:00", to: "21:00", closed: false },
  { day: "Friday", from: "10:00", to: "21:00", closed: false },
  { day: "Saturday", from: "10:00", to: "17:00", closed: false },
  { day: "Sunday", from: "10:00", to: "17:00", closed: true },
];

export default function StudioSettingsClient({
  studioId,
  initial,
}: {
  studioId: string;
  initial: {
    displayName: string;
    ianaTimezone: string | null;
    shortDescription: string | null;
    longDescription: string | null;
    email: string;
    phone: string | null;
    city: string | null;
    country: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    websiteUrl: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    whatsappNumber: string | null;
    openingHours: { day: string; from: string; to: string; closed: boolean }[] | null;
    supportedLanguages: string[];
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/studios/${studioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName,
          ianaTimezone: form.ianaTimezone?.trim() || "",
          shortDescription: form.shortDescription?.trim() || "",
          longDescription: form.longDescription?.trim() || "",
          email: form.email,
          phone: form.phone?.trim() || "",
          city: form.city?.trim() || "",
          country: form.country?.trim() || "",
          addressLine1: form.addressLine1?.trim() || "",
          addressLine2: form.addressLine2?.trim() || "",
          postalCode: form.postalCode?.trim() || "",
          websiteUrl: form.websiteUrl?.trim() || "",
          instagramUrl: form.instagramUrl?.trim() || "",
          facebookUrl: form.facebookUrl?.trim() || "",
          whatsappNumber: form.whatsappNumber?.trim() || "",
          openingHours: form.openingHours,
          supportedLanguages: form.supportedLanguages,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMsg("Saved.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} className={cn(ui.card, "space-y-4")}>
      <h2 className="text-lg font-semibold text-stone-900">Studio profile</h2>
      <p className="text-sm text-[var(--muted)]">Basics you can change without leaving the panel. Stripe and activation stay in the full workspace.</p>
      {msg ? <p className={cn("text-sm", msg === "Saved." ? "text-emerald-800" : "text-rose-700")}>{msg}</p> : null}

      <label>
        <span className={ui.label}>Display name</span>
        <input className={cn(ui.input, "mt-1")} value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} required />
      </label>
      <label>
        <span className={ui.label}>Public email</span>
        <input className={cn(ui.input, "mt-1")} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
      </label>
      <label>
        <span className={ui.label}>Phone</span>
        <input className={cn(ui.input, "mt-1")} value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      </label>
      <label>
        <span className={ui.label}>Short description</span>
        <textarea className={cn(ui.input, "mt-1 min-h-[72px]")} value={form.shortDescription ?? ""} onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} />
      </label>
      <label>
        <span className={ui.label}>Long description</span>
        <textarea className={cn(ui.input, "mt-1 min-h-[120px]")} value={form.longDescription ?? ""} onChange={(e) => setForm((f) => ({ ...f, longDescription: e.target.value }))} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={ui.label}>City</span>
          <input className={cn(ui.input, "mt-1")} value={form.city ?? ""} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </label>
        <label>
          <span className={ui.label}>Country</span>
          <input className={cn(ui.input, "mt-1")} value={form.country ?? ""} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
        </label>
      </div>
      <label>
        <span className={ui.label}>Booking timezone</span>
        <input
          className={cn(ui.input, "mt-1 font-mono text-sm")}
          value={form.ianaTimezone ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, ianaTimezone: e.target.value }))}
          placeholder="Europe/Paris"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Used for Google Calendar sync and add-to-calendar links so class times match your local wall clock. Leave blank to default to Europe/Paris.
        </p>
      </label>
      <label>
        <span className={ui.label}>Address line 1</span>
        <input className={cn(ui.input, "mt-1")} value={form.addressLine1 ?? ""} onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} />
      </label>
      <label>
        <span className={ui.label}>Address line 2</span>
        <input className={cn(ui.input, "mt-1")} value={form.addressLine2 ?? ""} onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))} />
      </label>
      <label>
        <span className={ui.label}>Postal code</span>
        <input className={cn(ui.input, "mt-1")} value={form.postalCode ?? ""} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} />
      </label>
      <label>
        <span className={ui.label}>Website</span>
        <input className={cn(ui.input, "mt-1")} value={form.websiteUrl ?? ""} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://…" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={ui.label}>Instagram</span>
          <input className={cn(ui.input, "mt-1")} value={form.instagramUrl ?? ""} onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))} />
        </label>
        <label>
          <span className={ui.label}>Facebook</span>
          <input className={cn(ui.input, "mt-1")} value={form.facebookUrl ?? ""} onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))} />
        </label>
      </div>
      <label>
        <span className={ui.label}>WhatsApp number</span>
        <input
          className={cn(ui.input, "mt-1")}
          value={form.whatsappNumber ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
          placeholder="+306940821618"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">E.164 format. Shows a WhatsApp button on your public studio page.</p>
      </label>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center justify-between">
          <span className={ui.label}>Opening hours</span>
          {!form.openingHours && (
            <button
              type="button"
              className={ui.buttonGhost}
              onClick={() => setForm((f) => ({ ...f, openingHours: DEFAULT_HOURS }))}
            >
              Set hours
            </button>
          )}
          {form.openingHours && (
            <button
              type="button"
              className={ui.buttonGhost}
              onClick={() => setForm((f) => ({ ...f, openingHours: null }))}
            >
              Clear
            </button>
          )}
        </div>
        {form.openingHours && (
          <div className="mt-3 space-y-2">
            {form.openingHours.map((h, idx) => (
              <div key={h.day} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-20 font-medium text-[var(--foreground)]">{h.day}</span>
                <label className="inline-flex items-center gap-1 text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={h.closed}
                    onChange={(e) => {
                      const next = [...form.openingHours!];
                      next[idx] = { ...next[idx], closed: e.target.checked };
                      setForm((f) => ({ ...f, openingHours: next }));
                    }}
                  />
                  Closed
                </label>
                {!h.closed && (
                  <>
                    <input
                      type="time"
                      className={cn(ui.input, "w-28")}
                      value={h.from}
                      onChange={(e) => {
                        const next = [...form.openingHours!];
                        next[idx] = { ...next[idx], from: e.target.value };
                        setForm((f) => ({ ...f, openingHours: next }));
                      }}
                    />
                    <span className="text-stone-400">–</span>
                    <input
                      type="time"
                      className={cn(ui.input, "w-28")}
                      value={h.to}
                      onChange={(e) => {
                        const next = [...form.openingHours!];
                        next[idx] = { ...next[idx], to: e.target.value };
                        setForm((f) => ({ ...f, openingHours: next }));
                      }}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <label>
        <span className={ui.label}>Supported languages</span>
        <input
          className={cn(ui.input, "mt-1")}
          value={form.supportedLanguages.join(", ")}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              supportedLanguages: e.target.value
                .split(",")
                .map((v) => v.trim().toLowerCase())
                .filter(Boolean),
            }))
          }
          placeholder="en, fr, de"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">Comma-separated ISO language codes. English fallback is automatic.</p>
      </label>
      <button type="submit" disabled={saving} className={ui.buttonPrimary}>
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
