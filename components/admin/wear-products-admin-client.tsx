"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ui } from "@/lib/ui-styles";

export type WearProductAdminRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const includeArchived = searchParams.get("archived") === "1";
  const [rows, setRows] = useState(initial);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [fullSpreadconnectDiscovery, setFullSpreadconnectDiscovery] = useState(false);

  const refresh = useCallback(async () => {
    const q = includeArchived ? "?includeArchived=1" : "";
    const r = await fetch(`/api/admin/wear-products${q}`);
    const j = await r.json();
    if (r.ok && j.products) setRows(j.products);
  }, [includeArchived]);

  async function patchProduct(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    setMsg("");
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

  async function deleteProduct(id: string, name: string) {
    if (
      !window.confirm(
        `Permanently delete “${name}”? This cannot be undone. Products with order history cannot be deleted — use Archive instead.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setErr("");
    setMsg("");
    const r = await fetch(`/api/admin/wear-products/${id}`, { method: "DELETE" });
    setBusy(false);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr((j as { error?: string }).error ?? "Delete failed");
      return;
    }
    setMsg("Product deleted.");
    await refresh();
  }

  async function syncFromSpreadconnect() {
    setBusy(true);
    setSyncing(true);
    setErr("");
    setMsg("");
    const ac = new AbortController();
    const timeoutMs = fullSpreadconnectDiscovery ? 600_000 : 120_000;
    const t = window.setTimeout(() => ac.abort(), timeoutMs);
    try {
      const r = await fetch("/api/admin/wear-products/sync-spreadconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullDiscovery: fullSpreadconnectDiscovery }),
        signal: ac.signal,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr((j as { error?: string }).error ?? "Spreadconnect sync failed");
        return;
      }
      const result = j as {
        syncedProducts?: number;
        createdProducts?: number;
        updatedProducts?: number;
        skippedUnchangedProducts?: number;
        archivedProducts?: number;
        skippedArticles?: number;
        refreshedByArticleId?: number;
        discoveryListPages?: number;
        fullCatalogScanCompleted?: boolean;
        syncMode?: string;
        skipRatio?: number;
      };
      const ratioPct =
        typeof result.skipRatio === "number" ? ` · skip ratio ${(result.skipRatio * 100).toFixed(1)}%` : "";
      const modeNote = result.syncMode ? ` · mode ${result.syncMode}` : "";
      setMsg(
        `Spreadconnect sync complete: ${result.syncedProducts ?? 0} checked · ${result.createdProducts ?? 0} created · ${result.updatedProducts ?? 0} updated · ${result.skippedUnchangedProducts ?? 0} unchanged · ${result.archivedProducts ?? 0} archived · ${result.skippedArticles ?? 0} skipped (API) · ${result.refreshedByArticleId ?? 0} refreshed by id · ${result.discoveryListPages ?? 0} list page(s)${
          result.fullCatalogScanCompleted ? " (list end reached)" : ""
        }${modeNote}${ratioPct}`,
      );
      await refresh();
      router.refresh();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setErr(`Spreadconnect sync timed out after ${timeoutMs / 1000}s. Try again or check server logs.`);
      } else {
        setErr(e instanceof Error ? e.message : "Spreadconnect sync failed");
      }
    } finally {
      window.clearTimeout(t);
      setBusy(false);
      setSyncing(false);
    }
  }

  async function backfillAssetHealth() {
    setBusy(true);
    setPromoting(true);
    setErr("");
    setMsg("");
    try {
      const r = await fetch("/api/admin/wear-products/backfill-asset-health", {
        method: "POST",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr((j as { error?: string }).error ?? "Asset-health backfill failed");
        return;
      }
      const result = j as { promoted?: number; scanned?: number; stillIneligible?: number };
      setMsg(
        `Asset-health backfill: ${result.promoted ?? 0} promoted to ready · ${result.scanned ?? 0} scanned · ${result.stillIneligible ?? 0} still ineligible (missing price/SKU/external-id)`,
      );
      await refresh();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Asset-health backfill failed");
    } finally {
      setBusy(false);
      setPromoting(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      {msg ? <p className={ui.successText}>{msg}</p> : null}

      <div className="flex flex-col gap-3">
        <label className="flex max-w-xl cursor-pointer items-start gap-2 text-sm text-stone-900">
          <input
            type="checkbox"
            className="mt-1"
            checked={fullSpreadconnectDiscovery}
            disabled={busy}
            onChange={(e) => setFullSpreadconnectDiscovery(e.target.checked)}
          />
          <span>
            <span className="font-medium text-stone-900">Full catalog scan</span> — list every Spreadconnect page
            (slow, heavy on their API). Leave off for routine updates: we refresh each known article by id, list only the
            first page to discover new ones, and skip database writes when nothing changed.
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/wear-products/new" className={ui.buttonPrimary}>
          New wear product
        </Link>
        <button type="button" disabled={busy} onClick={syncFromSpreadconnect} className={ui.buttonSecondary}>
          {syncing ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" className="text-stone-600" />
              Syncing Spreadconnect…
            </span>
          ) : (
            "Sync Spreadconnect catalog"
          )}
        </button>
        <button type="button" disabled={busy} onClick={backfillAssetHealth} className={ui.buttonGhost}>
          {promoting ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" className="text-stone-600" />
              Promoting…
            </span>
          ) : (
            "Make eligible products visible"
          )}
        </button>
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
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200/90 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50/80 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
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
                  <div className="font-medium text-stone-900">{p.name}</div>
                  {p.archivedAt ? (
                    <span className="mt-1 inline-block text-xs text-amber-800/80">Archived</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full border border-stone-200 px-2 py-0.5 text-xs text-stone-900">
                    {p.categoryLabel}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-stone-600">{p.slug}</td>
                <td className="px-4 py-3 text-stone-900">
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
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteProduct(p.id, p.name)}
                      className={`${ui.buttonGhost} min-h-9 px-3 text-xs text-red-800 hover:bg-red-50`}
                    >
                      Delete
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
