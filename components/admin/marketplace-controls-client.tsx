"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type StudioOpt = { id: string; displayName: string };

type PlacementRow = {
  id: string;
  studioId: string;
  studioName: string;
  placementSlot: string;
  sortOrder: number;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
};

type BoostRow = {
  id: string;
  studioId: string;
  studioName: string;
  boostType: string;
  boostValue: number;
  reason: string | null;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
};

export default function MarketplaceControlsClient() {
  const router = useRouter();
  const [studios, setStudios] = useState<StudioOpt[]>([]);
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [boosts, setBoosts] = useState<BoostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch("/api/admin/marketplace-controls");
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(typeof j.error === "string" ? j.error : "Load failed");
      return;
    }
    setStudios(j.studios ?? []);
    setPlacements(j.placements ?? []);
    setBoosts(j.boosts ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const [pStudio, setPStudio] = useState("");
  const [pSlot, setPSlot] = useState("homepage_hero");
  const [pReason, setPReason] = useState("");
  const [pBusy, setPBusy] = useState(false);

  const [bStudio, setBStudio] = useState("");
  const [bType, setBType] = useState("manual");
  const [bValue, setBValue] = useState("15");
  const [bReason, setBReason] = useState("");
  const [bBusy, setBBusy] = useState(false);

  async function addPlacement() {
    setPBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/featured-placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioId: pStudio,
          placementSlot: pSlot,
          reason: pReason,
          startsAt: new Date().toISOString(),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j.error ?? "Placement failed");
        return;
      }
      setPReason("");
      await load();
      router.refresh();
    } finally {
      setPBusy(false);
    }
  }

  async function addBoost() {
    setBBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/ranking-boosts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioId: bStudio,
          boostType: bType,
          boostValue: Number(bValue),
          reason: bReason,
          startsAt: new Date().toISOString(),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j.error ?? "Boost failed");
        return;
      }
      setBReason("");
      await load();
      router.refresh();
    } finally {
      setBBusy(false);
    }
  }

  async function deletePlacement(id: string) {
    const reason = window.prompt("Audit reason (min 3 chars) for removing this placement?");
    if (!reason || reason.trim().length < 3) return;
    const r = await fetch(`/api/admin/featured-placements/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(j.error ?? "Delete failed");
      return;
    }
    await load();
    router.refresh();
  }

  async function deleteBoost(id: string) {
    const reason = window.prompt("Audit reason (min 3 chars) for removing this boost?");
    if (!reason || reason.trim().length < 3) return;
    const r = await fetch(`/api/admin/ranking-boosts/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(j.error ?? "Delete failed");
      return;
    }
    await load();
    router.refresh();
  }

  if (loading) return <p className="text-sm text-stone-500">Loading marketplace controls…</p>;

  return (
    <div className="space-y-10">
      {err ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p> : null}

      <section className={`${ui.card} space-y-4`}>
        <h2 className="text-lg font-semibold text-amber-950">Featured placements</h2>
        <p className="text-sm text-stone-600">
          Curated rails (e.g. homepage hero). Public pages read active rows in-window; run ranking cron after large changes.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-stone-700">
            Studio
            <select
              className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2"
              value={pStudio}
              onChange={(e) => setPStudio(e.target.value)}
            >
              <option value="">—</option>
              {studios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-stone-700">
            Slot
            <select className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2" value={pSlot} onChange={(e) => setPSlot(e.target.value)}>
              <option value="homepage_hero">homepage_hero</option>
              <option value="category_top">category_top</option>
              <option value="trending">trending</option>
              <option value="seasonal">seasonal</option>
            </select>
          </label>
          <label className="text-sm text-stone-700 sm:col-span-2">
            Reason (audit)
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2"
              value={pReason}
              onChange={(e) => setPReason(e.target.value)}
              placeholder="Why add this placement?"
            />
          </label>
        </div>
        <button type="button" disabled={pBusy || !pStudio} className={ui.buttonSecondary} onClick={() => void addPlacement()}>
          {pBusy ? "Saving…" : "Add placement"}
        </button>

        <ul className="mt-4 divide-y divide-stone-100 text-sm">
          {placements.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <strong>{p.studioName}</strong> · {p.placementSlot} · order {p.sortOrder} ·{" "}
                {p.isActive ? "active" : "off"}
              </span>
              <button type="button" className="text-rose-700 underline" onClick={() => void deletePlacement(p.id)}>
                Remove
              </button>
            </li>
          ))}
          {placements.length === 0 ? <li className="py-2 text-stone-500">No placements yet.</li> : null}
        </ul>
      </section>

      <section className={`${ui.card} space-y-4`}>
        <h2 className="text-lg font-semibold text-amber-950">Ranking boosts</h2>
        <p className="text-sm text-stone-600">Time-bounded lift to the manual component of the composite score (see ranking cron).</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-stone-700">
            Studio
            <select className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2" value={bStudio} onChange={(e) => setBStudio(e.target.value)}>
              <option value="">—</option>
              {studios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-stone-700">
            Type
            <select className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2" value={bType} onChange={(e) => setBType(e.target.value)}>
              <option value="manual">manual</option>
              <option value="featured">featured</option>
              <option value="seasonal">seasonal</option>
              <option value="paid">paid</option>
            </select>
          </label>
          <label className="text-sm text-stone-700">
            Value (0–100 scale)
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2"
              value={bValue}
              onChange={(e) => setBValue(e.target.value)}
            />
          </label>
          <label className="text-sm text-stone-700 sm:col-span-2">
            Reason (audit)
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2"
              value={bReason}
              onChange={(e) => setBReason(e.target.value)}
              placeholder="Campaign / note"
            />
          </label>
        </div>
        <button type="button" disabled={bBusy || !bStudio} className={ui.buttonSecondary} onClick={() => void addBoost()}>
          {bBusy ? "Saving…" : "Add boost"}
        </button>

        <ul className="mt-4 divide-y divide-stone-100 text-sm">
          {boosts.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <strong>{b.studioName}</strong> · {b.boostType} · {b.boostValue}
                {b.reason ? ` · ${b.reason}` : ""}
              </span>
              <button type="button" className="text-rose-700 underline" onClick={() => void deleteBoost(b.id)}>
                Remove
              </button>
            </li>
          ))}
          {boosts.length === 0 ? <li className="py-2 text-stone-500">No boosts yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
