"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ui } from "@/lib/ui-styles";
import { uploadImage } from "@/lib/client-upload";

type Category = { id: string; name: string; slug: string };
type ProductImage = { id?: string; imageUrl: string; altText?: string | null; isPrimary: boolean };
type ProductRow = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "active" | "inactive" | "archived";
  shortDescription?: string | null;
  fullDescription?: string | null;
  priceCents: number;
  salePriceCents?: number | null;
  sku?: string | null;
  stockQuantity: number;
  stockStatus: "in_stock" | "out_of_stock" | "backorder";
  categoryId?: string | null;
  materials?: string | null;
  careInstructions?: string | null;
  weightGrams?: number | null;
  dimensionsText?: string | null;
  shippingNotes?: string | null;
  returnNotes?: string | null;
  isFeatured: boolean;
  images: ProductImage[];
};

type FormState = {
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  priceEur: string;
  salePriceEur: string;
  sku: string;
  stockQuantity: string;
  stockStatus: "in_stock" | "out_of_stock" | "backorder";
  categoryId: string;
  materials: string;
  careInstructions: string;
  weightGrams: string;
  dimensionsText: string;
  shippingNotes: string;
  returnNotes: string;
  status: "draft" | "active" | "inactive" | "archived";
  isFeatured: boolean;
  images: ProductImage[];
};

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  priceEur: "25.00",
  salePriceEur: "",
  sku: "",
  stockQuantity: "1",
  stockStatus: "in_stock",
  categoryId: "",
  materials: "",
  careInstructions: "",
  weightGrams: "",
  dimensionsText: "",
  shippingNotes: "",
  returnNotes: "",
  status: "draft",
  isFeatured: false,
  images: [{ imageUrl: "", altText: "", isPrimary: true }],
};

function centsFromEuro(input: string): number | null {
  if (!input.trim()) return null;
  const n = Number.parseFloat(input);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function euroFromCents(cents?: number | null): string {
  if (typeof cents !== "number") return "";
  return (cents / 100).toFixed(2);
}

function formFromProduct(product: ProductRow): FormState {
  return {
    title: product.title,
    slug: product.slug,
    shortDescription: product.shortDescription ?? "",
    fullDescription: product.fullDescription ?? "",
    priceEur: euroFromCents(product.priceCents),
    salePriceEur: euroFromCents(product.salePriceCents),
    sku: product.sku ?? "",
    stockQuantity: String(product.stockQuantity),
    stockStatus: product.stockStatus,
    categoryId: product.categoryId ?? "",
    materials: product.materials ?? "",
    careInstructions: product.careInstructions ?? "",
    weightGrams: product.weightGrams != null ? String(product.weightGrams) : "",
    dimensionsText: product.dimensionsText ?? "",
    shippingNotes: product.shippingNotes ?? "",
    returnNotes: product.returnNotes ?? "",
    status: product.status,
    isFeatured: product.isFeatured,
    images:
      product.images.length > 0
        ? product.images.map((im) => ({
            id: im.id,
            imageUrl: im.imageUrl,
            altText: im.altText ?? "",
            isPrimary: im.isPrimary,
          }))
        : [{ imageUrl: "", altText: "", isPrimary: true }],
  };
}

export default function StudioProductsPage() {
  const { studioId } = useParams<{ studioId: string }>();
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const currentLabel = useMemo(() => (editingId ? "Save changes" : "Create product"), [editingId]);

  const load = useCallback(async () => {
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      fetch(`/api/studios/${studioId}/products`),
      fetch("/api/product-categories"),
    ]);
    const prodJson = await prodRes.json();
    const catJson = await catRes.json();
    setProducts(prodJson.products || []);
    setCategories(catJson.categories || []);
    setLoading(false);
  }, [studioId]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErr("");
    setOk("");
  }

  function openCreate() {
    resetForm();
    setShowEditor(true);
  }

  function openEdit(product: ProductRow) {
    setForm(formFromProduct(product));
    setEditingId(product.id);
    setShowEditor(true);
    setErr("");
    setOk("");
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateImage(idx: number, patch: Partial<ProductImage>) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((im, i) => (i === idx ? { ...im, ...patch } : im)),
    }));
  }

  function addImageRow() {
    setForm((prev) => ({
      ...prev,
      images: [...prev.images, { imageUrl: "", altText: "", isPrimary: false }],
    }));
  }

  function removeImageRow(idx: number) {
    setForm((prev) => {
      const next = prev.images.filter((_, i) => i !== idx);
      if (next.length === 0) next.push({ imageUrl: "", altText: "", isPrimary: true });
      if (!next.some((im) => im.isPrimary)) next[0].isPrimary = true;
      return { ...prev, images: next };
    });
  }

  function setPrimaryImage(idx: number) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((im, i) => ({ ...im, isPrimary: i === idx })),
    }));
  }

  async function onUploadImage(idx: number, file: File | null) {
    if (!file) return;
    try {
      setUploadingIndex(idx);
      setErr("");
      const uploaded = await uploadImage(file, `potterymania/products/${studioId}`);
      updateImage(idx, { imageUrl: uploaded.secureUrl });
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploadingIndex(null);
    }
  }

  async function submitProduct(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");

    const priceCents = centsFromEuro(form.priceEur);
    if (priceCents == null || priceCents < 50) {
      setErr("Price must be at least €0.50.");
      return;
    }
    const salePriceCents = form.salePriceEur.trim() ? centsFromEuro(form.salePriceEur) : null;
    if (form.salePriceEur.trim() && salePriceCents == null) {
      setErr("Sale price is invalid.");
      return;
    }
    const stockQuantity = Number.parseInt(form.stockQuantity, 10);
    if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
      setErr("Stock quantity must be 0 or more.");
      return;
    }
    const weightGrams = form.weightGrams.trim() ? Number.parseInt(form.weightGrams, 10) : null;
    if (form.weightGrams.trim() && (weightGrams == null || Number.isNaN(weightGrams) || weightGrams < 0)) {
      setErr("Weight must be a valid positive number.");
      return;
    }

    const images = form.images
      .map((im) => ({
        imageUrl: im.imageUrl.trim(),
        altText: im.altText?.trim() || undefined,
        isPrimary: im.isPrimary,
      }))
      .filter((im) => im.imageUrl);

    if (images.length === 0) {
      setErr("Add at least one image.");
      return;
    }
    if (images.filter((im) => im.isPrimary).length !== 1) {
      setErr("Choose exactly one primary image.");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      shortDescription: form.shortDescription.trim() || undefined,
      fullDescription: form.fullDescription.trim() || undefined,
      priceCents,
      salePriceCents,
      sku: form.sku.trim() || undefined,
      stockQuantity,
      stockStatus: form.stockStatus,
      categoryId: form.categoryId || null,
      materials: form.materials.trim() || undefined,
      careInstructions: form.careInstructions.trim() || undefined,
      weightGrams,
      dimensionsText: form.dimensionsText.trim() || undefined,
      shippingNotes: form.shippingNotes.trim() || undefined,
      returnNotes: form.returnNotes.trim() || undefined,
      status: form.status,
      isFeatured: form.isFeatured,
      images,
    };

    const endpoint = editingId
      ? `/api/studios/${studioId}/products/${editingId}`
      : `/api/studios/${studioId}/products`;
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setErr(json.error || "Could not save product.");
      return;
    }

    setOk(editingId ? "Product updated." : "Product created.");
    setShowEditor(false);
    resetForm();
    await load();
    router.refresh();
  }

  async function archiveProduct(productId: string) {
    setErr("");
    setOk("");
    const confirmed = window.confirm("Archive this product? It will disappear from the marketplace.");
    if (!confirmed) return;
    const res = await fetch(`/api/studios/${studioId}/products/${productId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || "Could not archive product.");
      return;
    }
    setOk("Product archived.");
    await load();
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800">
        ← Dashboard
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-amber-950">Products</h1>
          <p className="mt-1 text-sm text-stone-600">
            Build polished listings with full details, inventory, pricing, and image galleries.
          </p>
        </div>
        <button type="button" onClick={openCreate} className={ui.buttonPrimary}>
          Add product
        </button>
      </div>

      {err ? <p className={`${ui.errorText} mt-4`}>{err}</p> : null}
      {ok ? <p className={`${ui.successText} mt-4`}>{ok}</p> : null}

      {showEditor ? (
        <form onSubmit={submitProduct} className="mt-8 space-y-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">{editingId ? "Edit product" : "New product"}</h2>
              <p className="mt-1 text-sm text-stone-500">All public listing details are controlled here.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowEditor(false);
                resetForm();
              }}
              className={ui.buttonSecondary}
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={ui.label}>Title</span>
              <input
                className={`${ui.input} mt-1`}
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className={ui.label}>Slug</span>
              <input
                className={`${ui.input} mt-1`}
                value={form.slug}
                onChange={(e) => update("slug", e.target.value)}
                placeholder="Optional — generated from title"
              />
            </label>
            <label className="block">
              <span className={ui.label}>Price (EUR)</span>
              <input
                className={`${ui.input} mt-1`}
                value={form.priceEur}
                onChange={(e) => update("priceEur", e.target.value)}
                inputMode="decimal"
                required
              />
            </label>
            <label className="block">
              <span className={ui.label}>Sale price (EUR)</span>
              <input
                className={`${ui.input} mt-1`}
                value={form.salePriceEur}
                onChange={(e) => update("salePriceEur", e.target.value)}
                inputMode="decimal"
              />
            </label>
            <label className="block">
              <span className={ui.label}>SKU</span>
              <input className={`${ui.input} mt-1`} value={form.sku} onChange={(e) => update("sku", e.target.value)} />
            </label>
            <label className="block">
              <span className={ui.label}>Category</span>
              <select
                className={`${ui.input} mt-1`}
                value={form.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className={ui.label}>Short description</span>
            <textarea
              className={`${ui.input} mt-1 min-h-24`}
              value={form.shortDescription}
              onChange={(e) => update("shortDescription", e.target.value)}
              maxLength={240}
            />
          </label>

          <label className="block">
            <span className={ui.label}>Full description</span>
            <textarea
              className={`${ui.input} mt-1 min-h-36`}
              value={form.fullDescription}
              onChange={(e) => update("fullDescription", e.target.value)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={ui.label}>Materials</span>
              <input
                className={`${ui.input} mt-1`}
                value={form.materials}
                onChange={(e) => update("materials", e.target.value)}
              />
            </label>
            <label className="block">
              <span className={ui.label}>Care instructions</span>
              <input
                className={`${ui.input} mt-1`}
                value={form.careInstructions}
                onChange={(e) => update("careInstructions", e.target.value)}
              />
            </label>
            <label className="block">
              <span className={ui.label}>Weight (grams)</span>
              <input
                className={`${ui.input} mt-1`}
                value={form.weightGrams}
                onChange={(e) => update("weightGrams", e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="block">
              <span className={ui.label}>Dimensions</span>
              <input
                className={`${ui.input} mt-1`}
                value={form.dimensionsText}
                onChange={(e) => update("dimensionsText", e.target.value)}
                placeholder="e.g. 18cm x 10cm"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={ui.label}>Shipping notes</span>
              <textarea
                className={`${ui.input} mt-1 min-h-24`}
                value={form.shippingNotes}
                onChange={(e) => update("shippingNotes", e.target.value)}
              />
            </label>
            <label className="block">
              <span className={ui.label}>Return notes</span>
              <textarea
                className={`${ui.input} mt-1 min-h-24`}
                value={form.returnNotes}
                onChange={(e) => update("returnNotes", e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <label className="block">
              <span className={ui.label}>Stock quantity</span>
              <input
                className={`${ui.input} mt-1`}
                value={form.stockQuantity}
                onChange={(e) => update("stockQuantity", e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="block">
              <span className={ui.label}>Stock status</span>
              <select
                className={`${ui.input} mt-1`}
                value={form.stockStatus}
                onChange={(e) => update("stockStatus", e.target.value as FormState["stockStatus"])}
              >
                <option value="in_stock">In stock</option>
                <option value="out_of_stock">Out of stock</option>
                <option value="backorder">Backorder</option>
              </select>
            </label>
            <label className="block">
              <span className={ui.label}>Listing status</span>
              <select
                className={`${ui.input} mt-1`}
                value={form.status}
                onChange={(e) => update("status", e.target.value as FormState["status"])}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => update("isFeatured", e.target.checked)}
                className="h-4 w-4 accent-amber-900"
              />
              <span>Featured</span>
            </label>
          </div>

          <div className="space-y-3 rounded-xl border border-stone-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Images</h3>
                <p className="mt-1 text-sm text-stone-500">Add image URLs now; hosted uploads come next.</p>
              </div>
              <button type="button" onClick={addImageRow} className={ui.buttonSecondary}>
                Add image
              </button>
            </div>
            {form.images.map((image, idx) => (
              <div key={idx} className="grid gap-3 rounded-xl border border-stone-100 p-3 sm:grid-cols-[1fr,1fr,auto,auto]">
                <input
                  className={ui.input}
                  placeholder="Image URL"
                  value={image.imageUrl}
                  onChange={(e) => updateImage(idx, { imageUrl: e.target.value })}
                />
                <input
                  className={ui.input}
                  placeholder="Alt text"
                  value={image.altText ?? ""}
                  onChange={(e) => updateImage(idx, { altText: e.target.value })}
                />
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-stone-300 px-3 text-sm font-medium text-stone-700 hover:border-amber-400 hover:bg-amber-50/40">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => onUploadImage(idx, e.target.files?.[0] ?? null)}
                    disabled={saving || uploadingIndex === idx}
                  />
                  {uploadingIndex === idx ? "Uploading…" : "Upload"}
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm text-stone-600">
                  <input
                    type="radio"
                    checked={image.isPrimary}
                    onChange={() => setPrimaryImage(idx)}
                    name="primary-image"
                    className="h-4 w-4 accent-amber-900"
                  />
                  Primary
                </label>
                <button type="button" onClick={() => removeImageRow(idx)} className={ui.buttonGhost}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetForm} className={ui.buttonSecondary}>
              Reset
            </button>
            <button type="submit" disabled={saving} className={ui.buttonPrimary}>
              {saving ? "Saving…" : currentLabel}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-stone-500">Loading products…</p>
      ) : products.length === 0 ? (
        <div className={`${ui.cardMuted} mt-8`}>
          <p className="font-medium text-stone-800">No products yet</p>
          <p className="mt-2 text-sm text-stone-600">Create your first listing to start building your catalog.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {products.map((product) => {
            const primary = product.images.find((im) => im.isPrimary) ?? product.images[0];
            return (
              <div key={product.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-xl bg-stone-100">
                      {primary?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={primary.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-stone-900">{product.title}</h2>
                      <p className="mt-1 text-sm text-stone-500">
                        {product.status} · €{((product.salePriceCents ?? product.priceCents) / 100).toFixed(2)}
                        {product.salePriceCents ? ` (was €${(product.priceCents / 100).toFixed(2)})` : ""}
                      </p>
                      <p className="mt-1 text-sm text-stone-500">
                        Stock {product.stockQuantity} · {product.stockStatus}
                        {product.isFeatured ? " · Featured" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEdit(product)} className={ui.buttonSecondary}>
                      Edit
                    </button>
                    <button type="button" onClick={() => archiveProduct(product.id)} className={ui.buttonGhost}>
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}