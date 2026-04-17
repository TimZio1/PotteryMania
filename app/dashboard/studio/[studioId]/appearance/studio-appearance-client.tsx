"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { StudioThemeRoot } from "@/components/studio-public/studio-theme-root";
import { platformUi } from "@/lib/ui-styles";
import { resolveStudioPublicTheme } from "@/lib/studio-theme/resolve";
import type { StudioPublicThemeV1, StudioThemePreset } from "@/lib/studio-theme/types";
import {
  STUDIO_ACCENT_TONES,
  STUDIO_BUTTON_STYLES,
  STUDIO_CORNER_STYLES,
  STUDIO_DENSITIES,
  STUDIO_FONT_PAIRS,
  STUDIO_IMAGE_STYLES,
  STUDIO_LAYOUT_MODES,
  STUDIO_PRIMARY_TONES,
} from "@/lib/studio-theme/types";

type ApiGet = {
  theme: StudioPublicThemeV1;
  tier: "starter" | "full";
  presetsAllowed: StudioThemePreset[];
  activationPaidAt: string | null;
};

export function StudioAppearanceClient({ studioId }: { studioId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [tier, setTier] = useState<"starter" | "full">("starter");
  const [presetsAllowed, setPresetsAllowed] = useState<StudioThemePreset[]>([]);
  const [activationPaidAt, setActivationPaidAt] = useState<Date | null>(null);
  const [draft, setDraft] = useState<StudioPublicThemeV1 | null>(null);

  const load = useCallback(async () => {
    setErr("");
    const r = await fetch(`/api/studios/${studioId}/public-theme`);
    if (!r.ok) {
      setErr("Could not load appearance settings.");
      setLoading(false);
      return;
    }
    const j = (await r.json()) as ApiGet;
    setDraft(j.theme);
    setTier(j.tier);
    setPresetsAllowed(j.presetsAllowed);
    setActivationPaidAt(j.activationPaidAt ? new Date(j.activationPaidAt) : null);
    setLoading(false);
  }, [studioId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    setErr("");
    setMsg("");
    const r = await fetch(`/api/studios/${studioId}/public-theme`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(typeof j.error === "string" ? j.error : "Save failed");
    } else {
      setMsg("Saved. Public page updates within a few seconds.");
      if (j.theme) setDraft(j.theme as StudioPublicThemeV1);
    }
    setSaving(false);
  }

  if (loading || !draft) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const previewResolved = resolveStudioPublicTheme({
    activationPaidAt,
    publicTheme: draft,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href={`/dashboard/studio/${studioId}`} className={`text-sm ${platformUi.buttonGhost} inline-flex px-0`}>
        ← Studio profile
      </Link>
      <p className={`${platformUi.overline} mt-6`}>Public page</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">Appearance</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Curated looks for your public studio page only. No custom hex or fonts — presets stay readable and on-brand across
        devices.
        {tier === "starter" ? " After activation, every preset unlocks." : ""}
      </p>

      {err ? <p className={`${platformUi.errorText} mt-4`}>{err}</p> : null}
      {msg ? <p className={`${platformUi.successText} mt-4`}>{msg}</p> : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={`${platformUi.card} space-y-5`}>
          <h2 className="text-sm font-semibold text-stone-900">Settings</h2>

          <label className={platformUi.label}>
            Theme preset
            <select
              className={`${platformUi.select} mt-1.5`}
              value={draft.themePreset}
              onChange={(e) => setDraft({ ...draft, themePreset: e.target.value as StudioPublicThemeV1["themePreset"] })}
            >
              {presetsAllowed.map((p) => (
                <option key={p} value={p}>
                  {p.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </label>

          <label className={platformUi.label}>
            Primary tone
            <select
              className={`${platformUi.select} mt-1.5`}
              value={draft.primaryTone}
              onChange={(e) => setDraft({ ...draft, primaryTone: e.target.value as StudioPublicThemeV1["primaryTone"] })}
            >
              {STUDIO_PRIMARY_TONES.map((p) => (
                <option key={p} value={p}>
                  {p.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          <label className={platformUi.label}>
            Accent
            <select
              className={`${platformUi.select} mt-1.5`}
              value={draft.accentTone}
              onChange={(e) => setDraft({ ...draft, accentTone: e.target.value as StudioPublicThemeV1["accentTone"] })}
            >
              {STUDIO_ACCENT_TONES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className={platformUi.label}>
            Font pairing
            <select
              className={`${platformUi.select} mt-1.5`}
              value={draft.fontPair}
              onChange={(e) => setDraft({ ...draft, fontPair: e.target.value as StudioPublicThemeV1["fontPair"] })}
            >
              {STUDIO_FONT_PAIRS.map((p) => (
                <option key={p} value={p}>
                  {p.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          <label className={platformUi.label}>
            Layout
            <select
              className={`${platformUi.select} mt-1.5`}
              value={draft.layoutMode}
              onChange={(e) => setDraft({ ...draft, layoutMode: e.target.value as StudioPublicThemeV1["layoutMode"] })}
            >
              {STUDIO_LAYOUT_MODES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className={platformUi.label}>
            Image corners
            <select
              className={`${platformUi.select} mt-1.5`}
              value={draft.imageStyle}
              onChange={(e) => setDraft({ ...draft, imageStyle: e.target.value as StudioPublicThemeV1["imageStyle"] })}
            >
              {STUDIO_IMAGE_STYLES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className={platformUi.label}>
            Buttons
            <select
              className={`${platformUi.select} mt-1.5`}
              value={draft.buttonStyle}
              onChange={(e) => setDraft({ ...draft, buttonStyle: e.target.value as StudioPublicThemeV1["buttonStyle"] })}
            >
              {STUDIO_BUTTON_STYLES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className={platformUi.label}>
            Card corners
            <select
              className={`${platformUi.select} mt-1.5`}
              value={draft.cornerStyle}
              onChange={(e) => setDraft({ ...draft, cornerStyle: e.target.value as StudioPublicThemeV1["cornerStyle"] })}
            >
              {STUDIO_CORNER_STYLES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className={platformUi.label}>
            Density
            <select
              className={`${platformUi.select} mt-1.5`}
              value={draft.density}
              onChange={(e) => setDraft({ ...draft, density: e.target.value as StudioPublicThemeV1["density"] })}
            >
              {STUDIO_DENSITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={draft.showSerifHeadings}
              onChange={(e) => setDraft({ ...draft, showSerifHeadings: e.target.checked })}
            />
            Serif headings
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={draft.useUppercaseLabels}
              onChange={(e) => setDraft({ ...draft, useUppercaseLabels: e.target.checked })}
            />
            Uppercase micro-labels
          </label>

          <button type="button" disabled={saving} className={`${platformUi.buttonPrimary} w-full`} onClick={() => void save()}>
            {saving ? "Saving…" : "Save public appearance"}
          </button>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Live preview</h2>
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-4 shadow-(--pm-shadow-rest)">
            <StudioThemeRoot theme={previewResolved}>
              <div className="st-card p-5">
                <p className={`text-xs st-muted ${draft.useUppercaseLabels ? "st-overline" : ""}`}>Your studio</p>
                <h1 className="st-h1 mt-1 text-2xl font-semibold">Preview headline</h1>
                <p className="st-body mt-3 text-sm">
                  Body copy uses your tone and pairing. Buttons and cards follow your selections.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="st-btn-primary text-sm">Primary</span>
                  <span className="st-btn-secondary text-sm">Secondary</span>
                </div>
              </div>
              <div className="st-grid md-2 mt-4">
                <div className="st-tile p-3">
                  <div className="st-media aspect-video bg-stone-200" />
                  <p className="st-h3 mt-2 text-sm">Class tile</p>
                  <p className="st-accent-text text-sm font-medium">€48 / person</p>
                </div>
                <div className="st-tile p-3">
                  <div className="st-media aspect-video bg-stone-200" />
                  <p className="st-h3 mt-2 text-sm">Product tile</p>
                  <p className="st-accent-text text-sm font-medium">€120</p>
                </div>
              </div>
            </StudioThemeRoot>
          </div>
          <Link href={`/studios/${studioId}`} target="_blank" rel="noreferrer" className={`${platformUi.buttonSecondary} mt-4 inline-flex`}>
            Open public page
          </Link>
        </div>
      </div>
    </div>
  );
}
