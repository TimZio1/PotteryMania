"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

export type AdminPlatformFeatureRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  currency: string;
  isActive: boolean;
  visibility: string;
  grantByDefault: boolean;
  stripePriceId: string | null;
  sortOrder: number;
};

export default function PlatformFeaturesAdminTable({ initial }: { initial: AdminPlatformFeatureRow[] }) {
  const [rows, setRows] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("addons");
  const [newPriceEur, setNewPriceEur] = useState("0");
  const [newGrantAll, setNewGrantAll] = useState(false);
  const [auditNote, setAuditNote] = useState("");

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [rows],
  );

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw.startsWith("catalog-feature-")) return;
    const featureId = raw.slice("catalog-feature-".length).trim();
    if (!featureId) return;
    const el = document.getElementById(raw);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashRowId(featureId);
    });
    const t = window.setTimeout(() => setFlashRowId(null), 2800);
    return () => window.clearTimeout(t);
  }, []);

  function withOptionalAuditReason(body: Record<string, unknown>): Record<string, unknown> {
    const t = auditNote.trim().slice(0, 500);
    if (!t.length) return body;
    return { ...body, reason: t };
  }

  async function patch(id: string, patchBody: Record<string, unknown>) {
    setPendingId(id);
    setMessage(null);
    const res = await fetch(`/api/admin/platform-features/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withOptionalAuditReason(patchBody)),
    });
    const data = await res.json();
    setPendingId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Save failed");
      return;
    }
    if (data.feature) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.feature } : r)));
      setMessage("Saved.");
    }
  }

  async function createFeature(ev: React.FormEvent) {
    ev.preventDefault();
    setCreating(true);
    setMessage(null);
    const price = Number(newPriceEur);
    const priceCents = Number.isFinite(price) && price >= 0 ? Math.round(price * 100) : 0;
    const res = await fetch("/api/admin/platform-features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        withOptionalAuditReason({
          slug: newSlug.trim().toLowerCase(),
          name: newName.trim(),
          description: newDesc,
          category: newCategory.trim() || "addons",
          priceCents,
          grantByDefault: newGrantAll,
          isActive: true,
          visibility: "public",
        }),
      ),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setMessage(data.error ?? "Create failed");
      return;
    }
    if (data.feature) {
      const f = data.feature;
      setRows((prev) => [
        ...prev,
        {
          id: f.id,
          slug: f.slug,
          name: f.name,
          description: f.description ?? "",
          category: f.category ?? "addons",
          priceCents: f.priceCents,
          currency: f.currency,
          isActive: f.isActive,
          visibility: f.visibility,
          grantByDefault: f.grantByDefault,
          stripePriceId: f.stripePriceId ?? null,
          sortOrder: f.sortOrder ?? 0,
        },
      ]);
      setNewSlug("");
      setNewName("");
      setNewDesc("");
      setNewCategory("addons");
      setNewPriceEur("0");
      setNewGrantAll(false);
      setMessage("Feature created.");
    }
  }

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm text-stone-600">{message}</p> : null}

      <label className="block rounded-xl border border-stone-200 bg-stone-50/80 p-3">
        <span className="text-xs font-medium text-stone-600">
          Optional audit note (appended to each save below, max 500 chars)
        </span>
        <textarea
          value={auditNote}
          onChange={(e) => setAuditNote(e.target.value.slice(0, 500))}
          rows={2}
          placeholder="e.g. Q2 pricing sync"
          className={cn(ui.input, "mt-1 w-full max-w-xl resize-y text-sm")}
        />
      </label>

      <form
        onSubmit={createFeature}
        className="rounded-2xl border border-dashed border-amber-300/80 bg-amber-50/40 p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-amber-950">Add catalog feature</h2>
        <p className="mt-1 text-xs text-stone-600">
          Slug is permanent (lowercase, hyphens). Use for runtime gates and API keys (e.g.{" "}
          <code className="font-mono">kiln_tracking</code>).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-medium text-stone-600">
            Slug *
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              required
              placeholder="my-addon"
              className={cn(ui.input, "mt-1 min-h-10 w-full font-mono text-sm")}
            />
          </label>
          <label className="block text-xs font-medium text-stone-600">
            Name *
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="Display name"
              className={cn(ui.input, "mt-1 min-h-10 w-full text-sm")}
            />
          </label>
          <label className="block text-xs font-medium text-stone-600">
            Category
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className={cn(ui.input, "mt-1 min-h-10 w-full text-sm")}
            />
          </label>
          <label className="block text-xs font-medium text-stone-600">
            List price (EUR)
            <input
              type="number"
              min={0}
              step={0.01}
              value={newPriceEur}
              onChange={(e) => setNewPriceEur(e.target.value)}
              className={cn(ui.input, "mt-1 min-h-10 w-full font-mono text-sm")}
            />
          </label>
        </div>
        <label className="mt-3 block text-xs font-medium text-stone-600">
          Description
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            className={cn(ui.input, "mt-1 w-full resize-y text-sm")}
          />
        </label>
        <label className="mt-3 flex items-center gap-2 text-xs text-stone-700">
          <input type="checkbox" checked={newGrantAll} onChange={(e) => setNewGrantAll(e.target.checked)} />
          Grant to all studios by default
        </label>
        <button
          type="submit"
          disabled={creating}
          className={cn(ui.buttonPrimary, "mt-4 min-h-10 px-4 text-sm")}
        >
          {creating ? "Creating…" : "Create feature"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="min-w-[220px] px-4 py-3">Feature</th>
              <th className="px-4 py-3">Sort</th>
              <th className="px-4 py-3">Price / mo</th>
              <th className="min-w-[200px] px-4 py-3">Stripe price id</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Grant all</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.map((f) => {
              const eur = (f.priceCents / 100).toFixed(2);
              const busy = pendingId === f.id;
              return (
                <tr
                  key={f.id}
                  id={`catalog-feature-${f.id}`}
                  className={cn(
                    "align-top transition-[background-color,box-shadow] duration-300",
                    flashRowId === f.id && "bg-amber-50/90 ring-2 ring-inset ring-amber-400",
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      key={`n-${f.id}-${f.name}`}
                      type="text"
                      defaultValue={f.name}
                      disabled={busy}
                      className={cn(ui.input, "mb-2 min-h-9 w-full max-w-xs py-1.5 font-medium")}
                      onBlur={(ev) => {
                        const v = ev.target.value.trim();
                        if (!v || v === f.name) return;
                        void patch(f.id, { name: v });
                      }}
                    />
                    <p className="font-mono text-xs text-stone-500">{f.slug}</p>
                    <textarea
                      key={`d-${f.id}-${f.description.slice(0, 20)}`}
                      defaultValue={f.description}
                      disabled={busy}
                      rows={2}
                      className={cn(ui.input, "mt-2 w-full max-w-md resize-y text-xs")}
                      onBlur={(ev) => {
                        const v = ev.target.value;
                        if (v === f.description) return;
                        void patch(f.id, { description: v });
                      }}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-stone-500">Category</span>
                      <input
                        key={`c-${f.id}-${f.category}`}
                        type="text"
                        defaultValue={f.category}
                        disabled={busy}
                        className={cn(ui.input, "min-h-8 w-32 py-1 font-mono text-xs")}
                        onBlur={(ev) => {
                          const v = ev.target.value.trim();
                          if (!v || v === f.category) return;
                          void patch(f.id, { category: v });
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      key={`s-${f.id}-${f.sortOrder}`}
                      type="number"
                      step={1}
                      defaultValue={f.sortOrder}
                      disabled={busy}
                      className={cn(ui.input, "w-16 min-h-9 py-1.5 font-mono text-xs")}
                      onBlur={(ev) => {
                        const v = Number(ev.target.value);
                        if (!Number.isFinite(v) || Math.round(v) === f.sortOrder) return;
                        void patch(f.id, { sortOrder: Math.round(v) });
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-500">{f.currency}</span>
                      <input
                        key={`p-${f.id}-${f.priceCents}`}
                        type="number"
                        min={0}
                        step={0.01}
                        defaultValue={eur}
                        disabled={busy}
                        className={cn(ui.input, "w-24 min-h-9 py-1.5 font-mono text-xs")}
                        onBlur={(ev) => {
                          const v = Number(ev.target.value);
                          if (!Number.isFinite(v) || v < 0) return;
                          const cents = Math.round(v * 100);
                          if (cents === f.priceCents) return;
                          void patch(f.id, { priceCents: cents });
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      key={f.stripePriceId ?? "empty"}
                      type="text"
                      defaultValue={f.stripePriceId ?? ""}
                      placeholder="price_…"
                      disabled={busy}
                      className={cn(ui.input, "min-h-9 py-1.5 font-mono text-xs")}
                      onBlur={(ev) => {
                        const v = ev.target.value.trim();
                        const next = v.length ? v : null;
                        const cur = f.stripePriceId ?? null;
                        if (next === cur) return;
                        void patch(f.id, { stripePriceId: next });
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={cn(ui.input, "min-h-9 py-1.5 text-xs")}
                      disabled={busy}
                      value={f.visibility}
                      onChange={(ev) => void patch(f.id, { visibility: ev.target.value })}
                    >
                      <option value="public">public</option>
                      <option value="beta">beta</option>
                      <option value="hidden">hidden</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={f.isActive}
                        disabled={busy}
                        onChange={(ev) => void patch(f.id, { isActive: ev.target.checked })}
                      />
                      Live
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={f.grantByDefault}
                        disabled={busy}
                        onChange={(ev) => void patch(f.id, { grantByDefault: ev.target.checked })}
                      />
                      All studios
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
