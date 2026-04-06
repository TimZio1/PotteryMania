"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";

export default function StudioSettingsClient({
  studioId,
  initial,
}: {
  studioId: string;
  initial: {
    displayName: string;
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
      <p className="text-sm text-stone-600">Basics you can change without leaving the panel. Stripe and activation stay in the full workspace.</p>
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
      <button type="submit" disabled={saving} className={ui.buttonPrimary}>
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
