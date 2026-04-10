"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SkeletonText } from "@/components/ui/skeleton";
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
    if (pReason.trim().length < 8) {
      setErr("Audit reason must be at least 8 characters.");
      return;
    }
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
    if (bReason.trim().length < 8) {
      setErr("Audit reason must be at least 8 characters.");
      return;
    }
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
    const reason = window.prompt("Audit reason (min 8 chars) for removing this placement?");
    if (!reason || reason.trim().length < 8) return;
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
    const reason = window.prompt("Audit reason (min 8 chars) for removing this boost?");
    if (!reason || reason.trim().length < 8) return;
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

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading browse controls">
        <SkeletonText className="max-w-md" lines={2} />
        <SkeletonText className="max-w-xl" lines={4} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {err ? (
        <p className={`rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 ${ui.errorText}`}>{err}</p>
      ) : null}

      <section className={`${ui.card} space-y-4`}>
        <h2 className="text-lg font-semibold text-amber-950">Featured placements</h2>
        <p className="text-sm text-stone-600">
          Featured studio slots (e.g. homepage hero). Public browsing is off today; keep placements ready if you turn it
          back on, and run ranking jobs after large changes.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={ui.label}>
            Studio
            <select className={`${ui.select} mt-1`} value={pStudio} onChange={(e) => setPStudio(e.target.value)}>
              <option value="">—</option>
              {studios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.label}>
            Slot
            <select className={`${ui.select} mt-1`} value={pSlot} onChange={(e) => setPSlot(e.target.value)}>
              <option value="homepage_hero">homepage_hero</option>
              <option value="category_top">category_top</option>
              <option value="trending">trending</option>
              <option value="seasonal">seasonal</option>
            </select>
          </label>
          <label className={`${ui.label} sm:col-span-2`}>
            Reason (audit)
            <input
              className={`${ui.input} mt-1`}
              value={pReason}
              onChange={(e) => setPReason(e.target.value)}
              placeholder="Why add this placement? (min 8 chars)"
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
        <p className="text-sm text-stone-600">
          Time-bounded lift to the manual part of the composite score (used when public browsing is enabled).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={ui.label}>
            Studio
            <select className={`${ui.select} mt-1`} value={bStudio} onChange={(e) => setBStudio(e.target.value)}>
              <option value="">—</option>
              {studios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.label}>
            Type
            <select className={`${ui.select} mt-1`} value={bType} onChange={(e) => setBType(e.target.value)}>
              <option value="manual">manual</option>
              <option value="featured">featured</option>
              <option value="seasonal">seasonal</option>
              <option value="paid">paid</option>
            </select>
          </label>
          <label className={ui.label}>
            Value (0–100 scale)
            <input className={`${ui.input} mt-1`} value={bValue} onChange={(e) => setBValue(e.target.value)} />
          </label>
          <label className={`${ui.label} sm:col-span-2`}>
            Reason (audit)
            <input
              className={`${ui.input} mt-1`}
              value={bReason}
              onChange={(e) => setBReason(e.target.value)}
              placeholder="Campaign / note (min 8 chars)"
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
