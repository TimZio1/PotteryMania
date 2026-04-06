"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ui } from "@/lib/ui-styles";

export type WearProductAdminRow = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  isFeatured: boolean;
  archivedAt: string | null;
  priceCents: number;
  currency: string;
  variantCount: number;
};

function eur(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export default function WearProductsAdminClient({ initial }: { initial: WearProductAdminRow[] }) {
  const searchParams = useSearchParams();
  const includeArchived = searchParams.get("archived") === "1";
  const [rows, setRows] = useState(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const q = includeArchived ? "?includeArchived=1" : "";
    const r = await fetch(`/api/admin/wear-products${q}`);
    const j = await r.json();
    if (r.ok && j.products) setRows(j.products);
  }, [includeArchived]);

  async function patchProduct(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/admin/wear-products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? "Update failed");
      return;
    }
    await refresh();
  }

  return (
    <div className="mt-8 space-y-6">
      {err ? <p className={ui.errorText}>{err}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/wear-products/new" className={ui.buttonPrimary}>
          New wear product
        </Link>
        <Link
          href={includeArchived ? "/admin/wear-products" : "/admin/wear-products?archived=1"}
          className={ui.buttonGhost}
        >
          {includeArchived ? "Hide archived" : "Show archived"}
        </Link>
        <Link href="/admin/wear-orders" className={ui.buttonGhost}>
          Wear orders
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200/90 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50/80 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Variants</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-amber-950">{p.name}</div>
                  {p.archivedAt ? (
                    <span className="mt-1 inline-block text-xs text-amber-800/80">Archived</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-stone-600">{p.slug}</td>
                <td className="px-4 py-3 text-stone-700">
                  {eur(p.priceCents)} {p.currency}
                </td>
                <td className="px-4 py-3 text-stone-600">{p.variantCount}</td>
                <td className="px-4 py-3 text-xs text-stone-600">
                  {p.isActive ? "Active" : "Inactive"}
                  {p.isFeatured ? " · Featured" : ""}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/wear-products/${p.id}`} className={`${ui.buttonGhost} min-h-9 px-3 text-xs`}>
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => patchProduct(p.id, { archived: !p.archivedAt })}
                      className={`${ui.buttonGhost} min-h-9 px-3 text-xs`}
                    >
                      {p.archivedAt ? "Unarchive" : "Archive"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || !!p.archivedAt}
                      onClick={() => patchProduct(p.id, { isActive: !p.isActive })}
                      className={`${ui.buttonGhost} min-h-9 px-3 text-xs`}
                    >
                      Toggle active
                    </button>
                    <button
                      type="button"
                      disabled={busy || !!p.archivedAt}
                      onClick={() => patchProduct(p.id, { isFeatured: !p.isFeatured })}
                      className={`${ui.buttonGhost} min-h-9 px-3 text-xs`}
                    >
                      Toggle featured
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
