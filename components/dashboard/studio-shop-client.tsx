"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";
import { uploadImage } from "@/lib/client-upload";
import { optimizeImageForUpload } from "@/lib/optimize-image-client";
import { allCeramicCategories } from "@/lib/ceramic-categories";
import { billingIntervalLabel } from "@/lib/offering-pricing";
import type { StudioShopOrderRow, StudioShopProductRow } from "@/lib/studio-shop-page-data";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/studio-shop-page-data";

const PRODUCT_STATUS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const STOCK_STATUS = [
  { value: "in_stock", label: "In stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "backorder", label: "Backorder" },
];

const FULFILLMENT_OPTS = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "cancelled", label: "Cancelled" },
];

type Tab = "products" | "orders";

const PRODUCT_IMAGE_FOLDER = "potterymania/product-images";
const PRODUCT_IMAGE_MAX = 10;

type EditableProductImage = {
  imageUrl: string;
  altText: string;
  isPrimary: boolean;
};

export default function StudioShopClient({
  studioId,
  products: initialProducts,
  orders: initialOrders,
}: {
  studioId: string;
  products: StudioShopProductRow[];
  orders: StudioShopOrderRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<StudioShopProductRow | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "tableware",
    subcategory: "",
    shortDescription: "",
    priceEur: "",
    salePriceEur: "",
    recurringPriceEur: "",
    pricingType: "one_time",
    billingInterval: "monthly",
    billingIntervalCount: 1,
    minimumCommitmentCycles: 1,
    autoRenew: true,
    trialPeriodDays: 0,
    cancellationPolicyText: "",
    gracePeriodDays: 3,
    paymentRetryMax: 3,
    failedPaymentAction: "pause",
    sku: "",
    stockQuantity: 0,
    stockStatus: "in_stock",
    status: "draft",
  });
  const [formImages, setFormImages] = useState<EditableProductImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [uploadingCreateImage, setUploadingCreateImage] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    category: "tableware",
    priceEur: "0",
    recurringPriceEur: "0",
    pricingType: "one_time",
    billingInterval: "monthly",
    billingIntervalCount: 1,
    minimumCommitmentCycles: 1,
    autoRenew: true,
    trialPeriodDays: 0,
    cancellationPolicyText: "",
    gracePeriodDays: 3,
    paymentRetryMax: 3,
    failedPaymentAction: "pause",
  });
  const [createImages, setCreateImages] = useState<EditableProductImage[]>([]);
  const [orderBusy, setOrderBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    setSelected((cur) => {
      if (!cur) return null;
      return products.find((p) => p.id === cur.id) ?? null;
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (!qq) return true;
      return (
        p.title.toLowerCase().includes(qq) ||
        (p.sku?.toLowerCase().includes(qq) ?? false) ||
        (p.shortDescription?.toLowerCase().includes(qq) ?? false)
      );
    });
  }, [products, q, statusFilter]);

  const openProduct = useCallback((p: StudioShopProductRow) => {
    setSelected(p);
    setForm({
      title: p.title,
      category: p.category,
      subcategory: p.subcategory ?? "",
      shortDescription: p.shortDescription ?? "",
      priceEur: ((p.salePriceCents ?? p.priceCents) / 100).toFixed(2),
      salePriceEur: p.salePriceCents == null ? "" : (p.salePriceCents / 100).toFixed(2),
      recurringPriceEur: ((p.recurringPriceCents ?? 0) / 100).toFixed(2),
      pricingType: p.pricingType,
      billingInterval: p.billingInterval ?? "monthly",
      billingIntervalCount: p.billingIntervalCount ?? 1,
      minimumCommitmentCycles: p.minimumCommitmentCycles ?? 1,
      autoRenew: p.autoRenew,
      trialPeriodDays: p.trialPeriodDays ?? 0,
      cancellationPolicyText: p.cancellationPolicyText ?? "",
      gracePeriodDays: p.gracePeriodDays,
      paymentRetryMax: p.paymentRetryMax,
      failedPaymentAction: p.failedPaymentAction,
      sku: p.sku ?? "",
      stockQuantity: p.stockQuantity,
      stockStatus: p.stockStatus,
      status: p.status,
    });
    setFormImages(
      [...p.images]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((image, idx) => ({
          imageUrl: image.imageUrl,
          altText: image.altText ?? "",
          isPrimary: image.isPrimary || idx === 0,
        })),
    );
    setErr(null);
  }, []);

  function normalizePrimaryImage(images: EditableProductImage[]) {
    if (images.length === 0) return images;
    const hasPrimary = images.some((image) => image.isPrimary);
    if (hasPrimary) return images;
    return images.map((image, idx) => ({ ...image, isPrimary: idx === 0 }));
  }

  function moveImage(images: EditableProductImage[], index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return images;
    const next = [...images];
    const current = next[index];
    next[index] = next[target];
    next[target] = current;
    return next;
  }

  async function uploadProductImage(file: File) {
    const optimized = await optimizeImageForUpload(file, {
      maxWidth: 2000,
      maxHeight: 2000,
      maxInputBytes: 15_000_000,
      quality: 0.86,
    });
    return uploadImage(optimized, PRODUCT_IMAGE_FOLDER);
  }

  async function saveProduct() {
    if (!selected) return;
    const price = parseFloat(String(form.priceEur).replace(",", "."));
    if (!Number.isFinite(price) || price < 0) {
      setErr("Invalid price");
      return;
    }
    const priceCents = Math.round(price * 100);
    const salePriceRaw = String(form.salePriceEur).trim();
    const salePrice = salePriceRaw ? parseFloat(salePriceRaw.replace(",", ".")) : Number.NaN;
    if (salePriceRaw && (!Number.isFinite(salePrice) || salePrice < 0)) {
      setErr("Invalid sale price");
      return;
    }
    const salePriceCents = salePriceRaw ? Math.round(salePrice * 100) : null;
    if (salePriceCents != null && salePriceCents > priceCents) {
      setErr("Sale price cannot exceed base price");
      return;
    }
    const recurringPrice = parseFloat(String(form.recurringPriceEur).replace(",", "."));
    const recurringPriceCents = Number.isFinite(recurringPrice) ? Math.round(recurringPrice * 100) : 0;
    if (form.pricingType === "recurring" && recurringPriceCents < 50) {
      setErr("Recurring price must be at least €0.50");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const normalizedImages = normalizePrimaryImage(formImages).map((image) => ({
        imageUrl: image.imageUrl.trim(),
        altText: image.altText.trim() || undefined,
        isPrimary: image.isPrimary,
      }));
      const res = await fetch(`/api/studios/${studioId}/products/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          shortDescription: form.shortDescription.trim() || null,
          priceCents,
          pricingType: form.pricingType,
          recurringPriceCents: form.pricingType === "recurring" ? recurringPriceCents : null,
          billingInterval: form.pricingType === "recurring" ? form.billingInterval : null,
          billingIntervalCount: form.pricingType === "recurring" ? form.billingIntervalCount : null,
          minimumCommitmentCycles: form.pricingType === "recurring" ? form.minimumCommitmentCycles : null,
          autoRenew: form.pricingType === "recurring" ? form.autoRenew : true,
          trialPeriodDays:
            form.pricingType === "recurring" && form.trialPeriodDays > 0 ? form.trialPeriodDays : null,
          cancellationPolicyText:
            form.pricingType === "recurring" ? form.cancellationPolicyText.trim() || null : null,
          gracePeriodDays: form.pricingType === "recurring" ? form.gracePeriodDays : 3,
          paymentRetryMax: form.pricingType === "recurring" ? form.paymentRetryMax : 3,
          failedPaymentAction: form.pricingType === "recurring" ? form.failedPaymentAction : "pause",
          category: form.category,
          subcategory: form.subcategory.trim() || null,
          salePriceCents,
          sku: form.sku.trim() || null,
          stockQuantity: form.stockQuantity,
          stockStatus: form.stockStatus,
          status: form.status,
          images: normalizedImages,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(String(createForm.priceEur).replace(",", "."));
    const recurringPrice = parseFloat(String(createForm.recurringPriceEur).replace(",", "."));
    if (!createForm.title.trim() || !Number.isFinite(price) || price < 0) {
      setErr("Provide valid title and price");
      return;
    }
    if (createForm.pricingType === "recurring" && (!Number.isFinite(recurringPrice) || recurringPrice < 0.5)) {
      setErr("Provide valid recurring price (>= €0.50)");
      return;
    }
    setCreating(true);
    setErr(null);
    try {
      const normalizedImages = normalizePrimaryImage(createImages).map((image) => ({
        imageUrl: image.imageUrl.trim(),
        altText: image.altText.trim() || undefined,
        isPrimary: image.isPrimary,
      }));
      const res = await fetch(`/api/studios/${studioId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title.trim(),
          category: createForm.category,
          priceCents: Math.round(price * 100),
          pricingType: createForm.pricingType,
          recurringPriceCents:
            createForm.pricingType === "recurring" ? Math.round(recurringPrice * 100) : null,
          billingInterval: createForm.pricingType === "recurring" ? createForm.billingInterval : null,
          billingIntervalCount: createForm.pricingType === "recurring" ? createForm.billingIntervalCount : null,
          minimumCommitmentCycles:
            createForm.pricingType === "recurring" ? createForm.minimumCommitmentCycles : null,
          autoRenew: createForm.pricingType === "recurring" ? createForm.autoRenew : true,
          trialPeriodDays:
            createForm.pricingType === "recurring" && createForm.trialPeriodDays > 0
              ? createForm.trialPeriodDays
              : null,
          cancellationPolicyText:
            createForm.pricingType === "recurring" ? createForm.cancellationPolicyText.trim() || null : null,
          gracePeriodDays: createForm.pricingType === "recurring" ? createForm.gracePeriodDays : 3,
          paymentRetryMax: createForm.pricingType === "recurring" ? createForm.paymentRetryMax : 3,
          failedPaymentAction: createForm.pricingType === "recurring" ? createForm.failedPaymentAction : "pause",
          status: "draft",
          stockStatus: "in_stock",
          stockQuantity: 0,
          images: normalizedImages,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setCreateForm({
        title: "",
        category: "tableware",
        priceEur: "0",
        recurringPriceEur: "0",
        pricingType: "one_time",
        billingInterval: "monthly",
        billingIntervalCount: 1,
        minimumCommitmentCycles: 1,
        autoRenew: true,
        trialPeriodDays: 0,
        cancellationPolicyText: "",
        gracePeriodDays: 3,
        paymentRetryMax: 3,
        failedPaymentAction: "pause",
      });
      setCreateImages([]);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function patchOrder(orderId: string, payload: Record<string, unknown>) {
    setOrderBusy(orderId);
    setErr(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      const updatedOrder = (data as { order?: StudioShopOrderRow }).order;
      if (updatedOrder) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  fulfillmentStatus:
                    typeof payload.fulfillmentStatus === "string"
                      ? payload.fulfillmentStatus
                      : o.fulfillmentStatus,
                  trackingCarrier:
                    typeof payload.trackingCarrier === "string" ? payload.trackingCarrier : o.trackingCarrier,
                  trackingNumber:
                    typeof payload.trackingNumber === "string" ? payload.trackingNumber : o.trackingNumber,
                  trackingUrl:
                    typeof payload.trackingUrl === "string" ? payload.trackingUrl : o.trackingUrl,
                }
              : o,
          ),
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setOrderBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-1">
        <button
          type="button"
          className={cn(
            "rounded-t-lg px-4 py-2 text-sm font-medium",
            tab === "products" ? "bg-white text-amber-950 shadow-sm ring-1 ring-stone-200" : "text-stone-600 hover:text-stone-900",
          )}
          onClick={() => setTab("products")}
        >
          Products ({products.length})
        </button>
        <button
          type="button"
          className={cn(
            "rounded-t-lg px-4 py-2 text-sm font-medium",
            tab === "orders" ? "bg-white text-amber-950 shadow-sm ring-1 ring-stone-200" : "text-stone-600 hover:text-stone-900",
          )}
          onClick={() => setTab("orders")}
        >
          Sales ({orders.length})
        </button>
      </div>

      {err ? <p className="text-sm text-rose-700">{err}</p> : null}

      {tab === "products" ? (
        <div className="relative grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Low-stock highlight when quantity is between 1 and {DEFAULT_LOW_STOCK_THRESHOLD}. Open the{" "}
              <Link href={`/dashboard/products/${studioId}`} className="font-medium text-amber-900 underline">
                product workspace
              </Link>
              {" "}for full product controls.
            </p>

            <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50/95 p-4 backdrop-blur sm:flex-row sm:flex-wrap sm:items-end">
              <label className="block min-w-[180px] flex-1">
                <span className={ui.label}>Search</span>
                <input
                  className={cn(ui.input, "mt-1")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Title, SKU…"
                />
              </label>
              <label className="block w-full min-w-[120px] sm:w-36">
                <span className={ui.label}>Status</span>
                <select className={cn(ui.input, "mt-1")} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All</option>
                  {PRODUCT_STATUS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <form
              onSubmit={(e) => void createProduct(e)}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-stone-900">Create product</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block sm:col-span-2">
                  <span className={ui.label}>Title</span>
                  <input
                    className={`${ui.input} mt-1`}
                    value={createForm.title}
                    onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                </label>
                <label className="block">
                  <span className={ui.label}>Price (EUR)</span>
                  <input
                    className={`${ui.input} mt-1`}
                    inputMode="decimal"
                    value={createForm.priceEur}
                    onChange={(e) => setCreateForm((f) => ({ ...f, priceEur: e.target.value }))}
                    required
                  />
                </label>
                <label className="block">
                  <span className={ui.label}>Category</span>
                  <select
                    className={`${ui.input} mt-1`}
                    value={createForm.category}
                    onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {allCeramicCategories().map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="sm:col-span-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pricing model</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="create-pricing-type"
                        checked={createForm.pricingType === "one_time"}
                        onChange={() => setCreateForm((f) => ({ ...f, pricingType: "one_time" }))}
                      />
                      One-time purchase
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="create-pricing-type"
                        checked={createForm.pricingType === "recurring"}
                        onChange={() => setCreateForm((f) => ({ ...f, pricingType: "recurring" }))}
                      />
                      Recurring plan
                    </label>
                  </div>
                  {createForm.pricingType === "recurring" ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <label className="block">
                        <span className={ui.label}>Price per cycle (EUR)</span>
                        <input
                          className={`${ui.input} mt-1`}
                          inputMode="decimal"
                          value={createForm.recurringPriceEur}
                          onChange={(e) => setCreateForm((f) => ({ ...f, recurringPriceEur: e.target.value }))}
                        />
                      </label>
                      <label className="block">
                        <span className={ui.label}>Billing frequency</span>
                        <select
                          className={`${ui.input} mt-1`}
                          value={createForm.billingInterval}
                          onChange={(e) => setCreateForm((f) => ({ ...f, billingInterval: e.target.value }))}
                        >
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="custom">Custom</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className={ui.label}>Interval count</span>
                        <input
                          type="number"
                          min={1}
                          className={`${ui.input} mt-1`}
                          value={createForm.billingIntervalCount}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, billingIntervalCount: parseInt(e.target.value, 10) || 1 }))
                          }
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Product images ({createImages.length}/{PRODUCT_IMAGE_MAX})
                  </p>
                  <label className={cn(ui.buttonSecondary, "cursor-pointer px-3 py-1.5 text-xs")}>
                    {uploadingCreateImage ? "Uploading..." : "Upload image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={uploadingCreateImage || createImages.length >= PRODUCT_IMAGE_MAX}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.currentTarget.value = "";
                        if (!file) return;
                        if (createImages.length >= PRODUCT_IMAGE_MAX) {
                          setErr(`Maximum ${PRODUCT_IMAGE_MAX} images per product`);
                          return;
                        }
                        setUploadingCreateImage(true);
                        try {
                          const uploaded = await uploadProductImage(file);
                          setCreateImages((prev) =>
                            normalizePrimaryImage([
                              ...prev,
                              { imageUrl: uploaded.secureUrl, altText: "", isPrimary: prev.length === 0 },
                            ]),
                          );
                        } catch (error) {
                          setErr(error instanceof Error ? error.message : "Image upload failed");
                        } finally {
                          setUploadingCreateImage(false);
                        }
                      }}
                    />
                  </label>
                </div>
                {createImages.length === 0 ? (
                  <p className="mt-2 text-xs text-stone-500">Upload at least one image so products look complete in storefront listings.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {createImages.map((image, idx) => (
                      <li key={`${image.imageUrl}-${idx}`} className="rounded-lg border border-stone-200 bg-white p-2">
                        <div className="flex items-start gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image.imageUrl} alt="" className="h-14 w-14 rounded-md object-cover" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <input
                              className={cn(ui.input, "h-9 text-xs")}
                              placeholder="Alt text (optional)"
                              value={image.altText}
                              onChange={(e) =>
                                setCreateImages((prev) =>
                                  prev.map((item, imageIdx) =>
                                    imageIdx === idx ? { ...item, altText: e.target.value } : item,
                                  ),
                                )
                              }
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className={cn(ui.buttonGhost, "min-h-8 px-2 text-xs")}
                                onClick={() =>
                                  setCreateImages((prev) => moveImage(prev, idx, "up"))
                                }
                                disabled={idx === 0}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                className={cn(ui.buttonGhost, "min-h-8 px-2 text-xs")}
                                onClick={() =>
                                  setCreateImages((prev) => moveImage(prev, idx, "down"))
                                }
                                disabled={idx === createImages.length - 1}
                              >
                                Down
                              </button>
                              <label className="inline-flex items-center gap-1 text-xs text-stone-700">
                                <input
                                  type="radio"
                                  checked={image.isPrimary}
                                  onChange={() =>
                                    setCreateImages((prev) =>
                                      prev.map((item, imageIdx) => ({ ...item, isPrimary: imageIdx === idx })),
                                    )
                                  }
                                />
                                Primary
                              </label>
                              <button
                                type="button"
                                className="ml-auto text-xs font-medium text-red-600 hover:underline"
                                onClick={() =>
                                  setCreateImages((prev) =>
                                    normalizePrimaryImage(prev.filter((_, imageIdx) => imageIdx !== idx)),
                                  )
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="submit" disabled={creating} className={`${ui.buttonPrimary} mt-4`}>
                {creating ? "Creating..." : "Create draft"}
              </button>
            </form>

            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                        No products match.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isSel = selected?.id === p.id;
                      return (
                        <tr
                          key={p.id}
                          className={cn(
                            "cursor-pointer border-b border-stone-100 last:border-0 hover:bg-amber-50/50",
                            isSel && "bg-amber-50",
                            p.isLowStock && "bg-amber-50/30",
                          )}
                          tabIndex={0}
                          role="button"
                          onClick={() => openProduct(p)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openProduct(p);
                            }
                          }}
                        >
                          <td className="px-4 py-3 font-medium text-stone-900">
                            {p.title}
                            {p.isLowStock ? (
                              <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950">
                                Low stock
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-stone-600">
                            {p.categoryLabel}
                            {p.subcategory ? <span className="ml-1 text-xs text-stone-500">· {p.subcategory}</span> : null}
                          </td>
                          <td className="px-4 py-3 text-stone-600">{p.status}</td>
                          <td className="px-4 py-3 text-stone-600">
                            {p.stockQuantity}{" "}
                            <span className="text-xs text-stone-500">({p.stockStatus.replace(/_/g, " ")})</span>
                          </td>
                          <td className="px-4 py-3 text-stone-600">{p.sku ?? "—"}</td>
                          <td className="px-4 py-3 text-stone-600">
                            {p.pricingType === "recurring" && p.recurringPriceCents != null
                              ? `€${(p.recurringPriceCents / 100).toFixed(2)}/${billingIntervalLabel(
                                  p.billingInterval ?? "monthly",
                                  p.billingIntervalCount ?? 1,
                                )}`
                              : `€${((p.salePriceCents ?? p.priceCents) / 100).toFixed(2)}`}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selected ? (
            <aside
              className={cn(
                ui.card,
                "lg:sticky lg:top-20 h-fit space-y-3 border-amber-200/80 shadow-md max-lg:fixed max-lg:inset-x-4 max-lg:bottom-4 max-lg:z-20 max-lg:max-h-[88vh] overflow-y-auto",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-stone-500">Quick edit</p>
                <button type="button" className={ui.buttonGhost} onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
              <label>
                <span className={ui.label}>Title</span>
                <input className={cn(ui.input, "mt-1")} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </label>
              <label>
                <span className={ui.label}>Category</span>
                <select
                  className={cn(ui.input, "mt-1")}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {allCeramicCategories().map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={ui.label}>Subcategory (optional)</span>
                <input
                  className={cn(ui.input, "mt-1")}
                  value={form.subcategory}
                  onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
                />
              </label>
              <label>
                <span className={ui.label}>Short description</span>
                <textarea
                  className={cn(ui.input, "mt-1 min-h-[64px]")}
                  value={form.shortDescription}
                  onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                />
              </label>
              <label>
                <span className={ui.label}>Price (EUR)</span>
                <input
                  className={cn(ui.input, "mt-1")}
                  inputMode="decimal"
                  value={form.priceEur}
                  onChange={(e) => setForm((f) => ({ ...f, priceEur: e.target.value }))}
                />
              </label>
              <label>
                <span className={ui.label}>Sale price (EUR, optional)</span>
                <input
                  className={cn(ui.input, "mt-1")}
                  inputMode="decimal"
                  value={form.salePriceEur}
                  onChange={(e) => setForm((f) => ({ ...f, salePriceEur: e.target.value }))}
                  placeholder="Leave empty for no sale"
                />
              </label>
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pricing model</p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="edit-pricing-type"
                      checked={form.pricingType === "one_time"}
                      onChange={() => setForm((f) => ({ ...f, pricingType: "one_time" }))}
                    />
                    One-time purchase
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="edit-pricing-type"
                      checked={form.pricingType === "recurring"}
                      onChange={() => setForm((f) => ({ ...f, pricingType: "recurring" }))}
                    />
                    Recurring plan
                  </label>
                </div>
                {form.pricingType === "recurring" ? (
                  <div className="mt-3 grid gap-3">
                    <label>
                      <span className={ui.label}>Price per cycle (EUR)</span>
                      <input
                        className={cn(ui.input, "mt-1")}
                        inputMode="decimal"
                        value={form.recurringPriceEur}
                        onChange={(e) => setForm((f) => ({ ...f, recurringPriceEur: e.target.value }))}
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className={ui.label}>Frequency</span>
                        <select
                          className={cn(ui.input, "mt-1")}
                          value={form.billingInterval}
                          onChange={(e) => setForm((f) => ({ ...f, billingInterval: e.target.value }))}
                        >
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="custom">Custom</option>
                        </select>
                      </label>
                      <label>
                        <span className={ui.label}>Interval count</span>
                        <input
                          type="number"
                          min={1}
                          className={cn(ui.input, "mt-1")}
                          value={form.billingIntervalCount}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, billingIntervalCount: parseInt(e.target.value, 10) || 1 }))
                          }
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className={ui.label}>Min commitment (cycles)</span>
                        <input
                          type="number"
                          min={1}
                          className={cn(ui.input, "mt-1")}
                          value={form.minimumCommitmentCycles}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, minimumCommitmentCycles: parseInt(e.target.value, 10) || 1 }))
                          }
                        />
                      </label>
                      <label>
                        <span className={ui.label}>Trial period (days)</span>
                        <input
                          type="number"
                          min={0}
                          className={cn(ui.input, "mt-1")}
                          value={form.trialPeriodDays}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, trialPeriodDays: Math.max(0, parseInt(e.target.value, 10) || 0) }))
                          }
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className={ui.label}>Grace period (days)</span>
                        <input
                          type="number"
                          min={0}
                          className={cn(ui.input, "mt-1")}
                          value={form.gracePeriodDays}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, gracePeriodDays: Math.max(0, parseInt(e.target.value, 10) || 0) }))
                          }
                        />
                      </label>
                      <label>
                        <span className={ui.label}>Retry attempts</span>
                        <input
                          type="number"
                          min={0}
                          className={cn(ui.input, "mt-1")}
                          value={form.paymentRetryMax}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, paymentRetryMax: Math.max(0, parseInt(e.target.value, 10) || 0) }))
                          }
                        />
                      </label>
                    </div>
                    <label>
                      <span className={ui.label}>Cancellation rules</span>
                      <textarea
                        className={cn(ui.input, "mt-1 min-h-[64px]")}
                        value={form.cancellationPolicyText}
                        onChange={(e) => setForm((f) => ({ ...f, cancellationPolicyText: e.target.value }))}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={form.autoRenew}
                        onChange={(e) => setForm((f) => ({ ...f, autoRenew: e.target.checked }))}
                      />
                      Auto-renew enabled
                    </label>
                    <label>
                      <span className={ui.label}>On failed payment</span>
                      <select
                        className={cn(ui.input, "mt-1")}
                        value={form.failedPaymentAction}
                        onChange={(e) => setForm((f) => ({ ...f, failedPaymentAction: e.target.value }))}
                      >
                        <option value="pause">Pause access</option>
                        <option value="cancel">Cancel subscription</option>
                      </select>
                    </label>
                  </div>
                ) : null}
              </div>
              <label>
                <span className={ui.label}>SKU</span>
                <input className={cn(ui.input, "mt-1")} value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
              </label>
              <label>
                <span className={ui.label}>Stock quantity</span>
                <input
                  type="number"
                  min={0}
                  className={cn(ui.input, "mt-1")}
                  value={form.stockQuantity}
                  onChange={(e) => setForm((f) => ({ ...f, stockQuantity: parseInt(e.target.value, 10) || 0 }))}
                />
              </label>
              <label>
                <span className={ui.label}>Stock status</span>
                <select
                  className={cn(ui.input, "mt-1")}
                  value={form.stockStatus}
                  onChange={(e) => setForm((f) => ({ ...f, stockStatus: e.target.value }))}
                >
                  {STOCK_STATUS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={ui.label}>Listing status</span>
                <select className={cn(ui.input, "mt-1")} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  {PRODUCT_STATUS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Product images ({formImages.length}/{PRODUCT_IMAGE_MAX})
                  </p>
                  <label className={cn(ui.buttonSecondary, "cursor-pointer px-3 py-1.5 text-xs")}>
                    {uploadingEditImage ? "Uploading..." : "Upload image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={uploadingEditImage || formImages.length >= PRODUCT_IMAGE_MAX}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.currentTarget.value = "";
                        if (!file) return;
                        if (formImages.length >= PRODUCT_IMAGE_MAX) {
                          setErr(`Maximum ${PRODUCT_IMAGE_MAX} images per product`);
                          return;
                        }
                        setUploadingEditImage(true);
                        try {
                          const uploaded = await uploadProductImage(file);
                          setFormImages((prev) =>
                            normalizePrimaryImage([
                              ...prev,
                              { imageUrl: uploaded.secureUrl, altText: "", isPrimary: prev.length === 0 },
                            ]),
                          );
                        } catch (error) {
                          setErr(error instanceof Error ? error.message : "Image upload failed");
                        } finally {
                          setUploadingEditImage(false);
                        }
                      }}
                    />
                  </label>
                </div>
                {formImages.length === 0 ? (
                  <p className="mt-2 text-xs text-stone-500">No images yet. Upload at least one image for storefront quality.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {formImages.map((image, idx) => (
                      <li key={`${image.imageUrl}-${idx}`} className="rounded-lg border border-stone-200 bg-white p-2">
                        <div className="flex items-start gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image.imageUrl} alt="" className="h-14 w-14 rounded-md object-cover" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <input
                              className={cn(ui.input, "h-9 text-xs")}
                              placeholder="Alt text (optional)"
                              value={image.altText}
                              onChange={(e) =>
                                setFormImages((prev) =>
                                  prev.map((item, imageIdx) =>
                                    imageIdx === idx ? { ...item, altText: e.target.value } : item,
                                  ),
                                )
                              }
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className={cn(ui.buttonGhost, "min-h-8 px-2 text-xs")}
                                onClick={() =>
                                  setFormImages((prev) => moveImage(prev, idx, "up"))
                                }
                                disabled={idx === 0}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                className={cn(ui.buttonGhost, "min-h-8 px-2 text-xs")}
                                onClick={() =>
                                  setFormImages((prev) => moveImage(prev, idx, "down"))
                                }
                                disabled={idx === formImages.length - 1}
                              >
                                Down
                              </button>
                              <label className="inline-flex items-center gap-1 text-xs text-stone-700">
                                <input
                                  type="radio"
                                  checked={image.isPrimary}
                                  onChange={() =>
                                    setFormImages((prev) =>
                                      prev.map((item, imageIdx) => ({ ...item, isPrimary: imageIdx === idx })),
                                    )
                                  }
                                />
                                Primary
                              </label>
                              <button
                                type="button"
                                className="ml-auto text-xs font-medium text-red-600 hover:underline"
                                onClick={() =>
                                  setFormImages((prev) =>
                                    normalizePrimaryImage(prev.filter((_, imageIdx) => imageIdx !== idx)),
                                  )
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="button" disabled={saving} onClick={() => void saveProduct()} className={cn(ui.buttonPrimary, "w-full")}>
                {saving ? "Saving…" : "Save"}
              </button>
            </aside>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Fulfillment</th>
                <th className="px-4 py-3">Tracking</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                    No product sales yet.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 text-stone-600">{o.createdAt.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {o.customerName}
                      <br />
                      <span className="text-xs">{o.customerEmail}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600">
                      <ul className="list-inside list-disc">
                        {o.items.map((it, i) => (
                          <li key={i}>
                            {it.title} × {it.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-stone-600">€{(o.totalCents / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-stone-600">{o.paymentStatus}</td>
                    <td className="px-4 py-3">
                      <select
                        className={cn(ui.input, "text-sm")}
                        value={o.fulfillmentStatus}
                        disabled={orderBusy === o.id}
                        onChange={(e) =>
                          void patchOrder(o.id, {
                            fulfillmentStatus: e.target.value,
                          })
                        }
                      >
                        {FULFILLMENT_OPTS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="min-w-44 space-y-2">
                        <input
                          className={cn(ui.input, "h-9 text-xs")}
                          defaultValue={o.trackingCarrier ?? ""}
                          placeholder="Carrier"
                          onBlur={(e) =>
                            void patchOrder(o.id, {
                              trackingCarrier: e.target.value,
                            })
                          }
                        />
                        <input
                          className={cn(ui.input, "h-9 text-xs")}
                          defaultValue={o.trackingNumber ?? ""}
                          placeholder="Tracking number"
                          onBlur={(e) =>
                            void patchOrder(o.id, {
                              trackingNumber: e.target.value,
                            })
                          }
                        />
                        <input
                          className={cn(ui.input, "h-9 text-xs")}
                          defaultValue={o.trackingUrl ?? ""}
                          placeholder="Tracking URL"
                          onBlur={(e) =>
                            void patchOrder(o.id, {
                              trackingUrl: e.target.value,
                            })
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
