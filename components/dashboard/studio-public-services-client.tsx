"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";
import type { PublicServiceKey, PublicServiceModesState, ServiceMode } from "@/lib/studio-public-service-modes";

const ROWS: { key: PublicServiceKey; title: string; hint: string }[] = [
  { key: "classes", title: "Experiences & reservations", hint: "Upcoming sessions, experience tiles, and direct booking when active." },
  { key: "shop", title: "Catalog / products", hint: "Product grid and direct add-to-cart on your public page when active." },
  { key: "contact", title: "Contact", hint: "Hero contact button: in-app mailto when active, or your own link." },
];

const MODE_OPTIONS: { value: ServiceMode; label: string }[] = [
  { value: "hidden", label: "Off" },
  { value: "visible", label: "Visible" },
  { value: "visible_link", label: "Visible with link" },
  { value: "active", label: "Active" },
];

export default function StudioPublicServicesClient({
  studioId,
  initial,
}: {
  studioId: string;
  initial: PublicServiceModesState;
}) {
  const router = useRouter();
  const [modes, setModes] = useState<PublicServiceModesState>(initial);
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
        body: JSON.stringify({ publicServiceModes: modes }),
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

  function setRow(key: PublicServiceKey, patch: Partial<PublicServiceModesState[PublicServiceKey]>) {
    setModes((m) => ({
      ...m,
      [key]: { ...m[key], ...patch },
    }));
  }

  return (
    <form onSubmit={(e) => void save(e)} className={cn(ui.card, "space-y-5")}>
      <div>
        <h2 className="text-lg font-semibold text-stone-900">What customers can do on your page</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Control how experiences, catalog, and contact appear on your public studio page (<code className="text-xs">/studios/…</code>).{" "}
          <strong>Off</strong> hides the block; <strong>Visible</strong> shows it without direct booking or cart;{" "}
          <strong>Visible with link</strong> uses your URL for CTAs; <strong>Active</strong> uses built-in flows.
        </p>
      </div>
      {msg ? <p className={cn("text-sm", msg === "Saved." ? "text-emerald-800" : "text-rose-700")}>{msg}</p> : null}

      <ul className="space-y-6">
        {ROWS.map(({ key, title, hint }) => {
          const row = modes[key];
          return (
            <li key={key} className="rounded-lg border border-stone-200 bg-stone-50/60 p-4">
              <p className="font-medium text-stone-900">{title}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>
              <fieldset className="mt-3 flex flex-wrap gap-2">
                <legend className="sr-only">Mode for {title}</legend>
                {MODE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                      row.mode === opt.value
                        ? "border-amber-700 bg-amber-50 text-amber-950"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300",
                    )}
                  >
                    <input
                      type="radio"
                      name={`svc-${key}`}
                      className="sr-only"
                      checked={row.mode === opt.value}
                      onChange={() => {
                        setRow(key, {
                          mode: opt.value,
                          linkUrl: opt.value === "visible_link" ? row.linkUrl : null,
                        });
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </fieldset>
              {row.mode === "visible_link" ? (
                <label className="mt-3 block">
                  <span className={ui.label}>Link URL</span>
                  <input
                    className={cn(ui.input, "mt-1 font-mono text-sm")}
                    type="url"
                    inputMode="url"
                    placeholder="https://… or mailto:…"
                    value={row.linkUrl ?? ""}
                    onChange={(e) => setRow(key, { linkUrl: e.target.value.trim() || null })}
                  />
                </label>
              ) : null}
            </li>
          );
        })}
      </ul>

      <button type="submit" className={ui.buttonPrimary} disabled={saving}>
        {saving ? "Saving…" : "Save public services"}
      </button>
    </form>
  );
}
