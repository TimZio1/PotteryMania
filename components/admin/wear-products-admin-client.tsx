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
  const [promoting, setPromoting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    stage: string;
    label: string;
    done?: number;
    total?: number;
  } | null>(null);

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

  async function fullSyncSpreadconnect() {
    if (
      !window.confirm(
        "Run a FULL Spreadconnect catalog sync? This lists the entire remote catalog, updates products and variants, and archives wear rows whose Spreadconnect article no longer exists (404) or is not in the remote snapshot. It can take several minutes — keep this tab open.",
      )
    ) {
      return;
    }
    setBusy(true);
    setSyncing(true);
    setSyncProgress(null);
    setErr("");
    setMsg("");
    try {
      const r = await fetch("/api/admin/wear-products/sync-spreadconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ fullDiscovery: true, stream: true }),
        signal: AbortSignal.timeout(600_000),
      });

      const ct = r.headers.get("content-type") ?? "";
      const isNdjson = ct.includes("x-ndjson") || ct.includes("ndjson");

      if (isNdjson && r.body) {
        const decoder = new TextDecoder();
        let buffer = "";
        let resultPayload: Record<string, unknown> | null = null;
        let streamError: string | null = null;

        const reader = r.body.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              let row: Record<string, unknown>;
              try {
                row = JSON.parse(trimmed) as Record<string, unknown>;
              } catch {
                continue;
              }
              const t = row.type;
              if (t === "progress") {
                const label = typeof row.label === "string" ? row.label : "Working…";
                const stage = typeof row.stage === "string" ? row.stage : "products";
                const done = typeof row.done === "number" ? row.done : undefined;
                const total = typeof row.total === "number" ? row.total : undefined;
                setSyncProgress({ stage, label, done, total });
              } else if (t === "error") {
                streamError = typeof row.error === "string" ? row.error : "Spreadconnect sync failed";
              } else if (t === "result") {
                resultPayload = row;
              }
            }
          }
          buffer += decoder.decode();
          const tail = buffer.trim();
          if (tail) {
            try {
              const row = JSON.parse(tail) as Record<string, unknown>;
              const t = row.type;
              if (t === "error") {
                streamError = typeof row.error === "string" ? row.error : streamError ?? "Spreadconnect sync failed";
              } else if (t === "result") {
                resultPayload = row;
              }
            } catch {
              /* ignore */
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (!r.ok && !streamError && !resultPayload) {
          setErr(`Spreadconnect sync failed (HTTP ${r.status}).`);
          return;
        }
        if (streamError) {
          setErr(streamError);
          return;
        }
        if (!resultPayload) {
          setErr("Spreadconnect sync ended without a result — try again.");
          return;
        }
        const j = resultPayload;
        const created = typeof j.createdProducts === "number" ? j.createdProducts : 0;
        const updated = typeof j.updatedProducts === "number" ? j.updatedProducts : 0;
        const unchanged = typeof j.skippedUnchangedProducts === "number" ? j.skippedUnchangedProducts : 0;
        const archDel =
          typeof j.archivedDeletedSpreadconnectArticles === "number" ? j.archivedDeletedSpreadconnectArticles : 0;
        const archSnap =
          typeof j.archivedNotInRemoteCatalogSnapshot === "number" ? j.archivedNotInRemoteCatalogSnapshot : 0;
        const archPh = typeof j.archivedProducts === "number" ? j.archivedProducts : 0;
        setMsg(
          `Spreadconnect full sync: +${created} created · ${updated} updated · ${unchanged} unchanged · archived (deleted article 404): ${archDel} · archived (not in remote catalog snapshot): ${archSnap} · placeholder cleanup: ${archPh}`,
        );
        await refresh();
        router.refresh();
        return;
      }

      const raw = await r.text();
      let j: Record<string, unknown> & { error?: string } = {};
      if (raw.trim()) {
        try {
          j = JSON.parse(raw) as typeof j;
        } catch {
          j = {};
        }
      }
      if (!r.ok) {
        const fromJson = typeof j.error === "string" ? j.error : "";
        const snippet = raw.trim().slice(0, 800);
        setErr(
          fromJson ||
            (snippet ? `HTTP ${r.status}: ${snippet}` : `Spreadconnect sync failed (HTTP ${r.status}).`),
        );
        return;
      }
      const created = typeof j.createdProducts === "number" ? j.createdProducts : 0;
      const updated = typeof j.updatedProducts === "number" ? j.updatedProducts : 0;
      const unchanged = typeof j.skippedUnchangedProducts === "number" ? j.skippedUnchangedProducts : 0;
      const archDel =
        typeof j.archivedDeletedSpreadconnectArticles === "number" ? j.archivedDeletedSpreadconnectArticles : 0;
      const archSnap =
        typeof j.archivedNotInRemoteCatalogSnapshot === "number" ? j.archivedNotInRemoteCatalogSnapshot : 0;
      const archPh = typeof j.archivedProducts === "number" ? j.archivedProducts : 0;
      setMsg(
        `Spreadconnect full sync: +${created} created · ${updated} updated · ${unchanged} unchanged · archived (deleted article 404): ${archDel} · archived (not in remote catalog snapshot): ${archSnap} · placeholder cleanup: ${archPh}`,
      );
      await refresh();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Spreadconnect sync failed");
    } finally {
      setBusy(false);
      setSyncing(false);
      setSyncProgress(null);
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

      {syncing && syncProgress ? (
        <div
          className="rounded-2xl border border-stone-200/90 bg-stone-50/90 px-4 py-3 text-sm text-stone-700 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <p className="font-medium text-stone-800">{syncProgress.label}</p>
          {typeof syncProgress.done === "number" &&
          typeof syncProgress.total === "number" &&
          syncProgress.total > 0 ? (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-xs text-stone-500">
                <span className="capitalize">{syncProgress.stage.replace(/_/g, " ")}</span>
                <span>
                  {syncProgress.done} / {syncProgress.total}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out"
                  style={{
                    width: `${Math.min(100, Math.round((syncProgress.done / syncProgress.total) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200">
              <div className="h-full w-full animate-pulse rounded-full bg-stone-400/70" />
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/wear-products/new" className={ui.buttonPrimary}>
          New wear product
        </Link>
        <button type="button" disabled={busy} onClick={fullSyncSpreadconnect} className={ui.buttonGhost}>
          {syncing ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" className="text-stone-600" />
              Syncing Spreadconnect…
            </span>
          ) : (
            "Full sync from Spreadconnect"
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
