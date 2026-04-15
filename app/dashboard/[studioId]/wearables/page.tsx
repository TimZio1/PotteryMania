"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
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
    } catch {
      setError("Could not load wearables configuration.");
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
        throw new Error(j.error || "Save failed");
      }
      setSuccess("Settings saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
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
        <p className="text-sm text-stone-500">Loading wearables settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error || "Configuration unavailable."}</p>
      </div>
    );
  }

  const marginPct = (marginBps / 100).toFixed(1);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <Link href={`/dashboard/${studioId}/settings`} className="text-sm text-amber-900 hover:text-amber-950">
          ← Back to settings
        </Link>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-stone-900">Wearables</h1>
        <p className="mt-1 text-sm text-stone-600">
          Sell curated pottery-inspired apparel directly from your shop — no stock, no shipping, no hassle.
        </p>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-stone-900">Enable Wearables Shop</p>
            <p className="mt-0.5 text-xs text-stone-500">Products appear on your public page when enabled.</p>
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
            <p className="font-medium text-stone-900">Your Commission</p>
            {config.marginLocked ? (
              <p className="mt-2 text-sm text-stone-500">
                Your margin is set to <strong>{marginPct}%</strong> and locked by the platform.
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs text-stone-500">
                  You earn {marginPct}% on every sale. Range: {(config.minMarginBps / 100).toFixed(0)}% – {(config.maxMarginBps / 100).toFixed(0)}%.
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
                  <span>{(config.minMarginBps / 100).toFixed(0)}%</span>
                  <span className="font-medium text-amber-900">{marginPct}%</span>
                  <span>{(config.maxMarginBps / 100).toFixed(0)}%</span>
                </div>
              </>
            )}
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-stone-900">Select Products</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {selected.size} of {config.catalog.length} selected
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-xs font-medium text-amber-900 hover:underline">
                  Select all
                </button>
                <button type="button" onClick={deselectAll} className="text-xs font-medium text-stone-500 hover:underline">
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
                      <p className="mt-0.5 text-xs text-stone-500">
                        Customer pays {formatEur(p.finalPriceCents)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="font-medium text-stone-900">Embed on your website</p>
            <p className="mt-1 text-xs text-stone-500">
              Paste one of these code snippets into your WordPress, Squarespace, Wix, or any HTML page to display your wearables shop.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Option A — JavaScript widget (recommended)</p>
                <p className="mt-1 text-xs text-stone-400">Works everywhere. Renders inline, matches your page. Light or dark theme.</p>
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
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Option B — Iframe embed</p>
                <p className="mt-1 text-xs text-stone-400">Simplest integration. Drop this into any HTML or page builder block.</p>
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
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
