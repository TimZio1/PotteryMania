"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";
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
    shortDescription: "",
    priceEur: "",
    sku: "",
    stockQuantity: 0,
    stockStatus: "in_stock",
    status: "draft",
  });
  const [saving, setSaving] = useState(false);
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
      shortDescription: p.shortDescription ?? "",
      priceEur: ((p.salePriceCents ?? p.priceCents) / 100).toFixed(2),
      sku: p.sku ?? "",
      stockQuantity: p.stockQuantity,
      stockStatus: p.stockStatus,
      status: p.status,
    });
    setErr(null);
  }, []);

  async function saveProduct() {
    if (!selected) return;
    const price = parseFloat(String(form.priceEur).replace(",", "."));
    if (!Number.isFinite(price) || price < 0) {
      setErr("Invalid price");
      return;
    }
    const priceCents = Math.round(price * 100);
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/products/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          shortDescription: form.shortDescription.trim() || null,
          priceCents,
          salePriceCents: null,
          sku: form.sku.trim() || null,
          stockQuantity: form.stockQuantity,
          stockStatus: form.stockStatus,
          status: form.status,
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

  async function patchOrderFulfillment(orderId: string, fulfillmentStatus: string) {
    setOrderBusy(orderId);
    setErr(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillmentStatus }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, fulfillmentStatus } : o)),
      );
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
          Orders ({orders.length})
        </button>
      </div>

      {err ? <p className="text-sm text-rose-700">{err}</p> : null}

      {tab === "products" ? (
        <div className="relative grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Low-stock highlight when quantity is between 1 and {DEFAULT_LOW_STOCK_THRESHOLD}. Full catalog and images in the{" "}
              <Link href={`/dashboard/products/${studioId}`} className="font-medium text-amber-900 underline">
                product workspace
              </Link>
              .
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

            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
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
                          onClick={() => openProduct(p)}
                        >
                          <td className="px-4 py-3 font-medium text-stone-900">
                            {p.title}
                            {p.isLowStock ? (
                              <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950">
                                Low stock
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-stone-600">{p.status}</td>
                          <td className="px-4 py-3 text-stone-600">
                            {p.stockQuantity}{" "}
                            <span className="text-xs text-stone-500">({p.stockStatus.replace(/_/g, " ")})</span>
                          </td>
                          <td className="px-4 py-3 text-stone-600">{p.sku ?? "—"}</td>
                          <td className="px-4 py-3 text-stone-600">
                            €{((p.salePriceCents ?? p.priceCents) / 100).toFixed(2)}
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
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Fulfillment</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                    No product orders yet.
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
                        onChange={(e) => void patchOrderFulfillment(o.id, e.target.value)}
                      >
                        {FULFILLMENT_OPTS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
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
