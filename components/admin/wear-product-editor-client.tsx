"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ui } from "@/lib/ui-styles";

export type WearVariantEditorRow = {
  id: string;
  label: string;
  sku: string | null;
  optionSize: string | null;
  optionColor: string | null;
  priceCents: number | null;
  stockQuantity: number | null;
  sortOrder: number;
  isActive: boolean;
};

export type WearProductEditorInitial = {
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  priceCents: number;
  currency: string;
  imagesText: string;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  archivedAt: string | null;
  externalFulfillmentId: string | null;
  variants: WearVariantEditorRow[];
};

export default function WearProductEditorClient({
  productId,
  initial,
}: {
  productId: string | null;
  initial?: WearProductEditorInitial;
}) {
  const router = useRouter();
  const isCreate = !productId;

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceCents, setPriceCents] = useState(String(initial?.priceCents ?? ""));
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [imagesText, setImagesText] = useState(initial?.imagesText ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive !== false);
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured === true);
  const [externalFulfillmentId, setExternalFulfillmentId] = useState(initial?.externalFulfillmentId ?? "");
  const [variants, setVariants] = useState<WearVariantEditorRow[]>(initial?.variants ?? []);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const reloadVariants = useCallback(async () => {
    if (!productId) return;
    const r = await fetch(`/api/admin/wear-products/${productId}`);
    const j = await r.json();
    if (r.ok && j.product?.variants) setVariants(j.product.variants);
  }, [productId]);

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const pc = parseInt(priceCents, 10);
    const so = parseInt(sortOrder, 10);
    const body = {
      name: name.trim(),
      slug: slug.trim(),
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      priceCents: Number.isFinite(pc) ? pc : 0,
      currency: currency.trim() || "EUR",
      imagesText,
      sortOrder: Number.isFinite(so) ? so : 0,
      isActive,
      isFeatured,
      externalFulfillmentId: externalFulfillmentId.trim() || null,
    };
    try {
      if (isCreate) {
        const r = await fetch("/api/admin/wear-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setErr((j as { error?: string }).error ?? "Create failed");
          return;
        }
        const id = (j as { id?: string }).id;
        if (id) router.push(`/admin/wear-products/${id}`);
        return;
      }
      const r = await fetch(`/api/admin/wear-products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr((j as { error?: string }).error ?? "Save failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const [newLabel, setNewLabel] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");

  async function addVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !newLabel.trim()) return;
    setBusy(true);
    setErr("");
    const r = await fetch("/api/admin/wear-product-variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wearProductId: productId,
        label: newLabel.trim(),
        optionSize: newSize.trim() || null,
        optionColor: newColor.trim() || null,
        priceCents: newPrice.trim() ? parseInt(newPrice, 10) : null,
        stockQuantity: newStock.trim() ? parseInt(newStock, 10) : null,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? "Variant create failed");
      return;
    }
    setNewLabel("");
    setNewSize("");
    setNewColor("");
    setNewPrice("");
    setNewStock("");
    await reloadVariants();
  }

  async function saveVariant(v: WearVariantEditorRow) {
    if (!productId) return;
    setBusy(true);
    setErr("");
    const priceCents =
      v.priceCents != null && Number.isFinite(v.priceCents) ? Math.max(0, Math.floor(v.priceCents)) : null;
    const stockQuantity =
      v.stockQuantity != null && Number.isFinite(v.stockQuantity)
        ? Math.max(0, Math.floor(v.stockQuantity))
        : null;
    const r = await fetch(`/api/admin/wear-product-variants/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: v.label,
        sku: v.sku,
        optionSize: v.optionSize,
        optionColor: v.optionColor,
        priceCents,
        stockQuantity,
        sortOrder: v.sortOrder,
        isActive: v.isActive,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? "Variant save failed");
      return;
    }
    await reloadVariants();
  }

  async function deleteVariant(id: string) {
    if (!productId || !confirm("Delete this variant?")) return;
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/admin/wear-product-variants/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) {
      setErr("Delete failed");
      return;
    }
    await reloadVariants();
  }

  function updateVariantLocal(id: string, patch: Partial<WearVariantEditorRow>) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  return (
    <div className="mt-8 max-w-3xl space-y-10">
      {err ? <p className={ui.errorText}>{err}</p> : null}

      <form onSubmit={saveProduct} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Name</label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Slug</label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-mono text-sm"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Sort order</label>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Subtitle</label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Description</label>
            <textarea
              rows={6}
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm leading-relaxed"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Long-form copy; shown on the PDP below the buy box."
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Base price (cents)</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              value={priceCents}
              onChange={(e) => setPriceCents(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Currency</label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm uppercase"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Image URLs (one per line, HTTPS)
            </label>
            <textarea
              rows={5}
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-mono text-xs"
              value={imagesText}
              onChange={(e) => setImagesText(e.target.value)}
              required={isCreate}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Spreadconnect SKU — no variants only (optional)
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-mono text-sm"
              value={externalFulfillmentId}
              onChange={(e) => setExternalFulfillmentId(e.target.value)}
              placeholder="e.g. P1026247707A12S5"
            />
            <p className="mt-1 text-[11px] text-stone-500">
              When this product has <strong>no</strong> variants, this value is used as the Spreadconnect line SKU on
              auto-submit. If you use variants, set SKU on each variant instead.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (visible when not archived)
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
            Featured
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={ui.buttonPrimary}>
            {isCreate ? "Create product" : "Save product"}
          </button>
          <Link href="/admin/wear-products" className={ui.buttonGhost}>
            Back to list
          </Link>
        </div>
        {!isCreate && initial?.archivedAt ? (
          <p className="text-sm text-amber-900">This product is archived — restore from the list view.</p>
        ) : null}
      </form>

      {!isCreate ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-950">Variants</h2>
          <p className="mt-1 text-sm text-stone-600">
            When variants exist, shoppers must pick one. Leave price empty to inherit the base price. Leave stock empty for
            unlimited.
          </p>

          <div className="mt-6 space-y-6">
            {variants.map((v) => (
              <div key={v.id} className="rounded-xl border border-stone-100 bg-stone-50/80 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-stone-500">Label</label>
                    <input
                      className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
                      value={v.label}
                      onChange={(e) => updateVariantLocal(v.id, { label: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Sort</label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
                      value={v.sortOrder}
                      onChange={(e) => updateVariantLocal(v.id, { sortOrder: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Size</label>
                    <input
                      className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
                      value={v.optionSize ?? ""}
                      onChange={(e) => updateVariantLocal(v.id, { optionSize: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Color</label>
                    <input
                      className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
                      value={v.optionColor ?? ""}
                      onChange={(e) => updateVariantLocal(v.id, { optionColor: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">SKU (Spreadconnect)</label>
                    <input
                      className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 font-mono text-sm"
                      value={v.sku ?? ""}
                      onChange={(e) => updateVariantLocal(v.id, { sku: e.target.value || null })}
                      placeholder="Article variant SKU"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Price override (cents, empty = base)</label>
                    <input
                      className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
                      value={
                        v.priceCents != null && Number.isFinite(v.priceCents) ? String(v.priceCents) : ""
                      }
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        if (t === "") {
                          updateVariantLocal(v.id, { priceCents: null });
                          return;
                        }
                        const n = parseInt(t, 10);
                        updateVariantLocal(v.id, { priceCents: Number.isFinite(n) ? n : null });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Stock (empty = ∞)</label>
                    <input
                      className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
                      value={
                        v.stockQuantity != null && Number.isFinite(v.stockQuantity)
                          ? String(v.stockQuantity)
                          : ""
                      }
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        if (t === "") {
                          updateVariantLocal(v.id, { stockQuantity: null });
                          return;
                        }
                        const n = parseInt(t, 10);
                        updateVariantLocal(v.id, { stockQuantity: Number.isFinite(n) ? n : null });
                      }}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={v.isActive}
                      onChange={(e) => updateVariantLocal(v.id, { isActive: e.target.checked })}
                    />
                    Variant active
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} className={ui.buttonSecondary} onClick={() => saveVariant(v)}>
                    Save variant
                  </button>
                  <button type="button" disabled={busy} className={ui.buttonGhost} onClick={() => deleteVariant(v.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={addVariant} className="mt-8 space-y-3 border-t border-stone-200 pt-6">
            <h3 className="text-sm font-semibold text-amber-950">Add variant</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs text-stone-500">Label *</label>
                <input
                  className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Medium · Black"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500">Size</label>
                <input
                  className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-stone-500">Color</label>
                <input
                  className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-stone-500">Price (cents)</label>
                <input
                  className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-stone-500">Stock</label>
                <input
                  className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" disabled={busy || !newLabel.trim()} className={ui.buttonSecondary}>
              Add variant
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
