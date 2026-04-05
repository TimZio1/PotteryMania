"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

export type CatalogFeatureOption = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
};

export type AdminFeatureBundleRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  validFrom: string | null;
  validUntil: string | null;
  stripePriceId: string | null;
  updatedAt: string;
  listSumCents: number;
  items: {
    featureId: string;
    featureSlug: string;
    featureName: string;
    featurePriceCents: number;
  }[];
};

function eurFmt(cents: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function isoDateOnly(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function toUtcMidnight(datePart: string): string | null {
  const t = datePart.trim();
  if (!t) return null;
  return `${t}T00:00:00.000Z`;
}

function FeatureOrderPicker({
  catalog,
  selectedIds,
  onChange,
  disabled,
}: {
  catalog: CatalogFeatureOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const byId = useMemo(() => new Map(catalog.map((f) => [f.id, f])), [catalog]);
  const available = catalog.filter((f) => !selectedIds.includes(f.id));

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  function removeAt(i: number) {
    onChange(selectedIds.filter((_, idx) => idx !== i));
  }

  function add(id: string) {
    if (selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-600">Features in bundle (order = checkout / display order).</p>
      <ol className="space-y-1.5 rounded-lg border border-stone-200 bg-stone-50/80 p-3">
        {selectedIds.length === 0 ? (
          <li className="text-xs text-stone-500">None — add from the dropdown below.</li>
        ) : (
          selectedIds.map((fid, i) => {
            const f = byId.get(fid);
            return (
              <li
                key={fid}
                className="flex flex-wrap items-center gap-2 rounded-md border border-stone-100 bg-white px-2 py-1.5 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-stone-800">{f?.name ?? fid}</span>
                  <span className="ml-2 font-mono text-[11px] text-stone-500">{f?.slug}</span>
                  {f ? (
                    <span className="ml-2 tabular-nums text-xs text-stone-600">{eurFmt(f.priceCents)}/mo</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  disabled={disabled || i === 0}
                  onClick={() => move(i, -1)}
                  className={cn(ui.buttonGhost, "min-h-8 px-2 text-xs")}
                >
                  Up
                </button>
                <button
                  type="button"
                  disabled={disabled || i === selectedIds.length - 1}
                  onClick={() => move(i, 1)}
                  className={cn(ui.buttonGhost, "min-h-8 px-2 text-xs")}
                >
                  Down
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeAt(i)}
                  className={cn(ui.buttonGhost, "min-h-8 px-2 text-xs text-red-700")}
                >
                  Remove
                </button>
              </li>
            );
          })
        )}
      </ol>
      <select
        className={cn(ui.input, "max-w-md text-sm")}
        disabled={disabled || available.length === 0}
        value=""
        onChange={(ev) => {
          const v = ev.target.value;
          if (v) add(v);
          ev.target.value = "";
        }}
      >
        <option value="">+ Add catalog feature…</option>
        {available.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} ({f.slug}) — {eurFmt(f.priceCents)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function FeatureBundlesAdminPanel({
  initialBundles,
  catalogFeatures,
}: {
  initialBundles: AdminFeatureBundleRow[];
  catalogFeatures: CatalogFeatureOption[];
}) {
  const [bundles, setBundles] = useState(initialBundles);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriceEur, setNewPriceEur] = useState("");
  const [newFrom, setNewFrom] = useState("");
  const [newUntil, setNewUntil] = useState("");
  const [newSortOrder, setNewSortOrder] = useState("0");
  const [newStripePriceId, setNewStripePriceId] = useState("");
  const [newFeatureIds, setNewFeatureIds] = useState<string[]>([]);

  const sorted = useMemo(
    () => [...bundles].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [bundles],
  );

  async function refreshOne(id: string) {
    const res = await fetch("/api/admin/feature-bundles");
    const data = await res.json();
    if (!res.ok) return;
    const row = (data.bundles as AdminFeatureBundleRow[]).find((b) => b.id === id);
    if (row) setBundles((prev) => prev.map((b) => (b.id === id ? row : b)));
  }

  async function saveBundle(id: string, patch: Record<string, unknown>) {
    setPendingId(id);
    setMessage(null);
    const res = await fetch(`/api/admin/feature-bundles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setPendingId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Save failed");
      return;
    }
    if (data.bundle) {
      setBundles((prev) => prev.map((b) => (b.id === id ? data.bundle : b)));
      setMessage("Saved.");
    }
  }

  async function deleteBundle(id: string, slug: string) {
    if (!window.confirm(`Delete bundle “${slug}”? This cannot be undone.`)) return;
    setPendingId(id);
    setMessage(null);
    const res = await fetch(`/api/admin/feature-bundles/${id}`, { method: "DELETE" });
    setPendingId(null);
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error ?? "Delete failed");
      return;
    }
    setBundles((prev) => prev.filter((b) => b.id !== id));
    setMessage("Bundle deleted.");
  }

  async function createBundle(ev: React.FormEvent) {
    ev.preventDefault();
    setCreating(true);
    setMessage(null);
    const price = Number(newPriceEur);
    const priceCents = Number.isFinite(price) && price >= 0 ? Math.round(price * 100) : 0;
    const so = Number(newSortOrder);
    const sortOrder = Number.isFinite(so) ? Math.round(so) : 0;
    const res = await fetch("/api/admin/feature-bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: newSlug.trim().toLowerCase(),
        name: newName.trim(),
        description: newDesc,
        priceCents,
        sortOrder,
        featureIds: newFeatureIds,
        validFrom: newFrom ? toUtcMidnight(newFrom) : null,
        validUntil: newUntil ? toUtcMidnight(newUntil) : null,
        stripePriceId: newStripePriceId.trim() ? newStripePriceId.trim() : null,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setMessage(data.error ?? "Create failed");
      return;
    }
    if (data.bundle) {
      setBundles((prev) => [...prev, data.bundle]);
      setNewSlug("");
      setNewName("");
      setNewDesc("");
      setNewPriceEur("");
      setNewFrom("");
      setNewUntil("");
      setNewSortOrder("0");
      setNewStripePriceId("");
      setNewFeatureIds([]);
      setMessage("Bundle created.");
    }
  }

  return (
    <div className="space-y-8">
      {message ? <p className="text-sm text-stone-600">{message}</p> : null}

      <form
        onSubmit={createBundle}
        className="rounded-2xl border border-dashed border-amber-300/80 bg-amber-50/40 p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-amber-950">New bundle</h2>
        <p className="mt-1 text-xs text-stone-600">
          Package price can be below the sum of list prices (shown as savings). Set a <strong>Stripe Price id</strong> (
          <code className="font-mono">price_…</code>) so studios get one subscription for the whole bundle; leave empty to
          only batch-enable free / grant-all add-ons on the vendor Features page.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-medium text-stone-600">
            Slug *
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              required
              placeholder="growth-pack"
              className={cn(ui.input, "mt-1 min-h-10 w-full font-mono text-sm")}
            />
          </label>
          <label className="block text-xs font-medium text-stone-600">
            Name *
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className={cn(ui.input, "mt-1 min-h-10 w-full text-sm")}
            />
          </label>
          <label className="block text-xs font-medium text-stone-600">
            Bundle price (EUR)
            <input
              type="number"
              min={0}
              step={0.01}
              value={newPriceEur}
              onChange={(e) => setNewPriceEur(e.target.value)}
              className={cn(ui.input, "mt-1 min-h-10 w-full font-mono text-sm")}
            />
          </label>
          <label className="block text-xs font-medium text-stone-600">
            Sort order
            <input
              type="number"
              step={1}
              value={newSortOrder}
              onChange={(e) => setNewSortOrder(e.target.value)}
              className={cn(ui.input, "mt-1 min-h-10 w-full font-mono text-sm")}
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-stone-600">
            Valid from (optional)
            <input
              type="date"
              value={newFrom}
              onChange={(e) => setNewFrom(e.target.value)}
              className={cn(ui.input, "mt-1 min-h-10 w-full text-sm")}
            />
          </label>
          <label className="block text-xs font-medium text-stone-600">
            Valid until (optional)
            <input
              type="date"
              value={newUntil}
              onChange={(e) => setNewUntil(e.target.value)}
              className={cn(ui.input, "mt-1 min-h-10 w-full text-sm")}
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
        <label className="mt-3 block text-xs font-medium text-stone-600">
          Stripe Price id (optional, bundle subscription)
          <input
            value={newStripePriceId}
            onChange={(e) => setNewStripePriceId(e.target.value)}
            placeholder="price_…"
            className={cn(ui.input, "mt-1 min-h-10 w-full max-w-md font-mono text-sm")}
          />
        </label>
        <div className="mt-4">
          <FeatureOrderPicker
            catalog={catalogFeatures}
            selectedIds={newFeatureIds}
            onChange={setNewFeatureIds}
            disabled={creating}
          />
        </div>
        <button
          type="submit"
          disabled={creating || newFeatureIds.length === 0}
          className={cn(ui.buttonPrimary, "mt-4 min-h-10 px-4 text-sm")}
        >
          {creating ? "Creating…" : "Create bundle"}
        </button>
      </form>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-amber-950">Existing bundles</h2>
        {sorted.length === 0 ? (
          <p className="text-sm text-stone-600">No bundles yet. Create one above.</p>
        ) : (
          sorted.map((b) => (
            <BundleEditorCard
              key={`${b.id}-${b.updatedAt}`}
              bundle={b}
              catalog={catalogFeatures}
              busy={pendingId === b.id}
              onSave={saveBundle}
              onDelete={deleteBundle}
              onRefresh={() => void refreshOne(b.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function BundleEditorCard({
  bundle: b,
  catalog,
  busy,
  onSave,
  onDelete,
  onRefresh,
}: {
  bundle: AdminFeatureBundleRow;
  catalog: CatalogFeatureOption[];
  busy: boolean;
  onSave: (id: string, patch: Record<string, unknown>) => void;
  onDelete: (id: string, slug: string) => void;
  onRefresh: () => void;
}) {
  const [name, setName] = useState(b.name);
  const [description, setDescription] = useState(b.description);
  const [priceEur, setPriceEur] = useState((b.priceCents / 100).toFixed(2));
  const [sortOrder, setSortOrder] = useState(String(b.sortOrder));
  const [isActive, setIsActive] = useState(b.isActive);
  const [validFrom, setValidFrom] = useState(isoDateOnly(b.validFrom));
  const [validUntil, setValidUntil] = useState(isoDateOnly(b.validUntil));
  const [stripePriceId, setStripePriceId] = useState(b.stripePriceId ?? "");
  const [featureIds, setFeatureIds] = useState(b.items.map((i) => i.featureId));

  const savings =
    b.listSumCents > b.priceCents ? Math.round(((b.listSumCents - b.priceCents) / b.listSumCents) * 100) : 0;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-stone-900">{b.name}</h3>
          <p className="font-mono text-xs text-stone-500">{b.slug}</p>
          <p className="mt-1 text-xs text-stone-600">
            À la carte sum <span className="font-medium">{eurFmt(b.listSumCents)}</span>
            {b.listSumCents > 0 ? (
              <>
                {" "}
                · Bundle <span className="font-medium">{eurFmt(b.priceCents)}</span>
                {savings > 0 ? (
                  <span className="text-emerald-700"> · ~{savings}% vs list</span>
                ) : null}
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={onRefresh} className={cn(ui.buttonGhost, "text-xs")}>
            Reload
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(b.id, b.slug)}
            className={cn(ui.buttonGhost, "text-xs text-red-700")}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs font-medium text-stone-600">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            className={cn(ui.input, "mt-1 min-h-9 w-full text-sm")}
          />
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Bundle price (EUR)
          <input
            type="number"
            min={0}
            step={0.01}
            value={priceEur}
            onChange={(e) => setPriceEur(e.target.value)}
            disabled={busy}
            className={cn(ui.input, "mt-1 min-h-9 w-full font-mono text-sm")}
          />
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Sort order
          <input
            type="number"
            step={1}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            disabled={busy}
            className={cn(ui.input, "mt-1 min-h-9 w-full font-mono text-sm")}
          />
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Valid from
          <input
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            disabled={busy}
            className={cn(ui.input, "mt-1 min-h-9 w-full text-sm")}
          />
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Valid until
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            disabled={busy}
            className={cn(ui.input, "mt-1 min-h-9 w-full text-sm")}
          />
        </label>
        <label className="mt-6 flex items-center gap-2 text-sm text-stone-700 sm:col-span-2 lg:col-span-1">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={busy} />
          Active (shown on vendor Features page when dates allow)
        </label>
      </div>
      <label className="mt-3 block text-xs font-medium text-stone-600">
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
          rows={2}
          className={cn(ui.input, "mt-1 w-full resize-y text-sm")}
        />
      </label>
      <label className="mt-3 block text-xs font-medium text-stone-600">
        Stripe Price id (optional)
        <input
          value={stripePriceId}
          onChange={(e) => setStripePriceId(e.target.value)}
          disabled={busy}
          placeholder="price_…"
          className={cn(ui.input, "mt-1 min-h-9 w-full max-w-md font-mono text-sm")}
        />
      </label>
      <div className="mt-4">
        <FeatureOrderPicker catalog={catalog} selectedIds={featureIds} onChange={setFeatureIds} disabled={busy} />
      </div>
      <button
        type="button"
        disabled={busy || featureIds.length === 0}
        className={cn(ui.buttonPrimary, "mt-4 min-h-10 px-4 text-sm")}
        onClick={() => {
          const p = Number(priceEur);
          const priceCents = Number.isFinite(p) && p >= 0 ? Math.round(p * 100) : b.priceCents;
          const so = Number(sortOrder);
          onSave(b.id, {
            name: name.trim() || b.name,
            description,
            priceCents,
            sortOrder: Number.isFinite(so) ? Math.round(so) : b.sortOrder,
            isActive,
            validFrom: validFrom ? toUtcMidnight(validFrom) : null,
            validUntil: validUntil ? toUtcMidnight(validUntil) : null,
            stripePriceId: stripePriceId.trim() ? stripePriceId.trim() : null,
            featureIds,
          });
        }}
      >
        {busy ? "Saving…" : "Save bundle"}
      </button>
    </div>
  );
}
