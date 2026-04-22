"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SOCIAL_PROOF_BASE } from "@/lib/brand";
import { formatWearMarginPercentFromBps } from "@/lib/wear-commission";
import { useCallback, useEffect, useState } from "react";

type CatalogProduct = {
  id: string;
  name: string;
  basePriceCents: number;
  finalPriceCents: number;
  image: string | null;
};

type WearConfig = {
  enabled: boolean;
  marginBps: number;
  marginLocked: boolean;
  minMarginBps: number;
  maxMarginBps: number;
  selectedProductIds: string[];
  catalog: CatalogProduct[];
  activeCreators?: number;
};

function formatEur(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export default function StudioWearablesPage() {
  const params = useParams<{ studioId: string }>();
  const studioId = params.studioId;

  const [config, setConfig] = useState<WearConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeCreators, setActiveCreators] = useState<number | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [marginBps, setMarginBps] = useState(2000);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/studios/${studioId}/wear`);
      if (!res.ok) throw new Error("Failed to load");
      const data: WearConfig = await res.json();
      setConfig(data);
      setEnabled(data.enabled);
      setMarginBps(data.marginBps);
      setSelected(new Set(data.selectedProductIds));
      if (typeof data.activeCreators === "number") setActiveCreators(data.activeCreators);
    } catch {
      setError("We couldn't load your wearables settings. Refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [studioId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/studios/${studioId}/wear`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          marginBps,
          selectedProductIds: [...selected],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "We couldn't save. Try again.");
      }
      setSuccess("Saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function toggleProduct(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (!config) return;
    setSelected(new Set(config.catalog.map((p) => p.id)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error || "We couldn't load your wearables settings. Refresh the page."}</p>
      </div>
    );
  }

  const marginLabel = formatWearMarginPercentFromBps(marginBps);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <Link href={`/dashboard/${studioId}/settings`} className="text-sm text-amber-900 hover:text-[var(--foreground)]">
          ← Back to settings
        </Link>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-stone-900">Wearables</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Sell pottery-themed apparel from your studio page. No stock, no shipping — we handle it.
        </p>
        {activeCreators != null && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {(activeCreators + SOCIAL_PROOF_BASE).toLocaleString()} creators selling wearables
          </p>
        )}
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-stone-900">Show wearables on my studio page</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Turn on to display the selected products to visitors.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${enabled ? "bg-amber-600" : "bg-stone-300"}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      </section>

      {enabled && (
        <>
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="font-medium text-stone-900">What you earn per sale</p>
            {(() => {
              const avgBase = config.catalog.length > 0
                ? config.catalog.reduce((s, p) => s + p.basePriceCents, 0) / config.catalog.length
                : 2500;
              const exampleEarning = (avgBase * marginBps) / 10000 / 100;
              return config.marginLocked ? (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Your margin is fixed at <strong>{marginLabel}</strong>.
                  {" "}You earn ~<strong>{formatEur(Math.round(avgBase * marginBps / 10000))}</strong> per sale.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    You earn {marginLabel} per sale — about <strong>€{exampleEarning.toFixed(2)}</strong> per item.
                  </p>
                  <input
                    type="range"
                    min={config.minMarginBps}
                    max={config.maxMarginBps}
                    step={100}
                    value={marginBps}
                    onChange={(e) => setMarginBps(Number(e.target.value))}
                    className="mt-3 w-full accent-amber-600"
                  />
                  <div className="mt-1 flex justify-between text-xs text-stone-400">
                    <span>{formatWearMarginPercentFromBps(config.minMarginBps)}</span>
                    <span className="font-medium text-amber-900">
                      {marginLabel} ≈ €{exampleEarning.toFixed(2)}/sale
                    </span>
                    <span>{formatWearMarginPercentFromBps(config.maxMarginBps)}</span>
                  </div>
                </>
              );
            })()}
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-stone-900">Pick what to sell</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {selected.size} of {config.catalog.length} selected
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-xs font-medium text-amber-900 hover:underline">
                  Select all
                </button>
                <button type="button" onClick={deselectAll} className="text-xs font-medium text-[var(--muted)] hover:underline">
                  Clear
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {config.catalog.map((p) => {
                const isSelected = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p.id)}
                    className={`group relative overflow-hidden rounded-lg border text-left transition ${
                      isSelected
                        ? "border-amber-500 bg-amber-50 ring-1 ring-amber-200"
                        : "border-stone-200 bg-white hover:border-amber-300"
                    }`}
                  >
                    <div className="relative aspect-square bg-stone-100">
                      {p.image ? (
                        <Image src={p.image} alt={p.name} fill className="object-cover" sizes="200px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-stone-400">No image</div>
                      )}
                      {isSelected && (
                        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-medium text-stone-900 line-clamp-1">{p.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        Customer pays {formatEur(p.finalPriceCents)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="font-medium text-stone-900">Embed on your own website</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Paste one of these into WordPress, Squarespace, Wix, or any HTML page.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Option A — JavaScript widget (recommended)</p>
                <p className="mt-1 text-xs text-stone-400">Matches your page style. Works anywhere.</p>
                <div className="relative mt-2">
                  <pre className="overflow-x-auto rounded-lg bg-stone-50 p-3 text-xs leading-relaxed text-stone-700 select-all">
{`<div id="potterymania-wearables" data-studio="${studioId}"></div>
<script src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/wearables.js" defer></script>`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      const code = `<div id="potterymania-wearables" data-studio="${studioId}"></div>\n<script src="${window.location.origin}/embed/wearables.js" defer></script>`;
                      navigator.clipboard.writeText(code);
                    }}
                    className="absolute right-2 top-2 rounded-md bg-white px-2 py-1 text-xs font-medium text-stone-600 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Option B — Iframe</p>
                <p className="mt-1 text-xs text-stone-400">Easiest. Drop it into any HTML block.</p>
                <div className="relative mt-2">
                  <pre className="overflow-x-auto rounded-lg bg-stone-50 p-3 text-xs leading-relaxed text-stone-700 select-all">
{`<iframe
  src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/${studioId}/wearables"
  style="width:100%;min-height:400px;border:none;"
  title="Wearables shop"
  loading="lazy"
></iframe>`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      const code = `<iframe src="${window.location.origin}/embed/${studioId}/wearables" style="width:100%;min-height:400px;border:none;" title="Wearables shop" loading="lazy"></iframe>`;
                      navigator.clipboard.writeText(code);
                    }}
                    className="absolute right-2 top-2 rounded-md bg-white px-2 py-1 text-xs font-medium text-stone-600 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Live preview</p>
              <div className="mt-2 overflow-hidden rounded-lg border border-stone-200">
                <iframe
                  src={typeof window !== "undefined" ? `${window.location.origin}/embed/${studioId}/wearables` : ""}
                  className="w-full border-0"
                  style={{ minHeight: 320 }}
                  title="Wearables embed preview"
                  loading="lazy"
                />
              </div>
              <p className="mt-1 text-xs text-stone-400">This is how the embed will look on your website.</p>
            </div>
          </section>
        </>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-5">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-amber-950 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-900 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
