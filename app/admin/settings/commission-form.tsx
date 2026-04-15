"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PLATFORM_COMMISSION_BPS } from "@/lib/commission-defaults";
import { ui } from "@/lib/ui-styles";

type CommissionData = {
  global: { product: number; booking: number };
  overrides: Array<{
    id: string;
    studioId: string | null;
    studioName: string;
    itemType: "product" | "booking";
    percentageBasisPoints: number;
    updatedAt: string;
  }>;
};

type WearPricing = {
  defaultMarginBps: number;
  minMarginBps: number;
  maxMarginBps: number;
  marginLocked: boolean;
};

export function CommissionForm() {
  const [loading, setLoading] = useState(true);
  const [globalProductBps, setGlobalProductBps] = useState(DEFAULT_PLATFORM_COMMISSION_BPS);
  const [globalBookingBps, setGlobalBookingBps] = useState(DEFAULT_PLATFORM_COMMISSION_BPS);
  const [overrideStudioId, setOverrideStudioId] = useState("");
  const [overrideItemType, setOverrideItemType] = useState<"product" | "booking">("product");
  const [overrideBps, setOverrideBps] = useState(DEFAULT_PLATFORM_COMMISSION_BPS);
  const [overrides, setOverrides] = useState<CommissionData["overrides"]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [wearDefault, setWearDefault] = useState(2000);
  const [wearMin, setWearMin] = useState(1000);
  const [wearMax, setWearMax] = useState(5000);
  const [wearLocked, setWearLocked] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [commR, wearR] = await Promise.all([
        fetch("/api/admin/commission", { cache: "no-store" }),
        fetch("/api/admin/wear-pricing", { cache: "no-store" }),
      ]);
      const j = (await commR.json()) as CommissionData & { error?: string };
      if (!commR.ok) throw new Error(j.error ?? "Failed to load commission");
      setGlobalProductBps(j.global.product);
      setGlobalBookingBps(j.global.booking);
      setOverrideBps(j.global.product);
      setOverrides(j.overrides);
      if (wearR.ok) {
        const w = (await wearR.json()) as WearPricing;
        setWearDefault(w.defaultMarginBps);
        setWearMin(w.minMarginBps);
        setWearMax(w.maxMarginBps);
        setWearLocked(w.marginLocked);
      }
      setMsg("");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not load commission settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveGlobal(itemType: "product" | "booking", percentageBasisPoints: number) {
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/commission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "global", itemType, percentageBasisPoints }),
      });
      const j = await r.json().catch(() => ({} as { error?: string }));
      if (!r.ok) throw new Error(j.error ?? "Failed to update commission");
      await load();
      setMsg(`${itemType === "product" ? "Product" : "Booking"} commission updated.`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not save commission");
    } finally {
      setSaving(false);
    }
  }

  async function saveOverride() {
    if (!overrideStudioId.trim()) {
      setMsg("Enter a studio ID to create an override.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/commission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "vendor",
          studioId: overrideStudioId.trim(),
          itemType: overrideItemType,
          percentageBasisPoints: overrideBps,
        }),
      });
      const j = await r.json().catch(() => ({} as { error?: string }));
      if (!r.ok) throw new Error(j.error ?? "Failed to save override");
      await load();
      setMsg("Studio override saved.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not save override");
    } finally {
      setSaving(false);
    }
  }

  async function saveWearPricing() {
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/wear-pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultMarginBps: wearDefault,
          minMarginBps: wearMin,
          maxMarginBps: wearMax,
          marginLocked: wearLocked,
        }),
      });
      const j = await r.json().catch(() => ({} as { error?: string }));
      if (!r.ok) throw new Error(j.error ?? "Failed to update wearables pricing");
      await load();
      setMsg("Wearables pricing updated.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not save wearables pricing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {msg ? <p className="text-sm text-stone-600">{msg}</p> : null}
      {loading ? <p className="text-sm text-stone-500">Loading commission settings…</p> : null}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-amber-950">Global platform commission</p>
        <p className="mt-2 text-sm text-stone-700">Define baseline fees for product sales and class bookings.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={ui.label}>Products (bps)</span>
            <input
              type="number"
              min={0}
              max={10000}
              className={`${ui.input} mt-1`}
              value={globalProductBps}
              onChange={(e) => setGlobalProductBps(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
            <button
              type="button"
              className={`${ui.buttonSecondary} mt-2`}
              disabled={saving}
              onClick={() => void saveGlobal("product", globalProductBps)}
            >
              Save product commission ({(globalProductBps / 100).toFixed(2)}%)
            </button>
          </label>
          <label className="block">
            <span className={ui.label}>Bookings (bps)</span>
            <input
              type="number"
              min={0}
              max={10000}
              className={`${ui.input} mt-1`}
              value={globalBookingBps}
              onChange={(e) => setGlobalBookingBps(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
            <button
              type="button"
              className={`${ui.buttonSecondary} mt-2`}
              disabled={saving}
              onClick={() => void saveGlobal("booking", globalBookingBps)}
            >
              Save booking commission ({(globalBookingBps / 100).toFixed(2)}%)
            </button>
          </label>
        </div>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-amber-950">Per-studio override</p>
        <p className="mt-2 text-sm text-stone-700">Override commission for a specific studio and item type.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <label className="sm:col-span-2">
            <span className={ui.label}>Studio ID</span>
            <input className={`${ui.input} mt-1`} value={overrideStudioId} onChange={(e) => setOverrideStudioId(e.target.value)} />
          </label>
          <label>
            <span className={ui.label}>Item type</span>
            <select className={`${ui.input} mt-1`} value={overrideItemType} onChange={(e) => setOverrideItemType(e.target.value as "product" | "booking")}>
              <option value="product">Product</option>
              <option value="booking">Booking</option>
            </select>
          </label>
          <label>
            <span className={ui.label}>BPS</span>
            <input
              type="number"
              min={0}
              max={10000}
              className={`${ui.input} mt-1`}
              value={overrideBps}
              onChange={(e) => setOverrideBps(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
          </label>
        </div>
        <button type="button" className={`${ui.buttonPrimary} mt-3`} disabled={saving} onClick={() => void saveOverride()}>
          Save studio override
        </button>
        <div className="mt-4 space-y-2">
          {overrides.length === 0 ? (
            <p className="text-xs text-stone-500">No active overrides.</p>
          ) : (
            overrides.map((row) => (
              <div key={row.id} className="rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700">
                <span className="font-medium">{row.studioName}</span> ({row.studioId}) · {row.itemType} ·{" "}
                {(row.percentageBasisPoints / 100).toFixed(2)}%
              </div>
            ))
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-amber-950">Wearables — studio margin controls</p>
        <p className="mt-2 text-sm text-stone-700">
          Studios earn a margin on wearable sales. Control the default, allowed range, and whether studios can adjust their own margin.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className={ui.label}>Default margin (bps)</span>
            <input
              type="number"
              min={0}
              max={10000}
              className={`${ui.input} mt-1`}
              value={wearDefault}
              onChange={(e) => setWearDefault(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
            <span className="mt-0.5 block text-xs text-stone-400">{(wearDefault / 100).toFixed(1)}%</span>
          </label>
          <label className="block">
            <span className={ui.label}>Min margin (bps)</span>
            <input
              type="number"
              min={0}
              max={10000}
              className={`${ui.input} mt-1`}
              value={wearMin}
              onChange={(e) => setWearMin(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
            <span className="mt-0.5 block text-xs text-stone-400">{(wearMin / 100).toFixed(1)}%</span>
          </label>
          <label className="block">
            <span className={ui.label}>Max margin (bps)</span>
            <input
              type="number"
              min={0}
              max={10000}
              className={`${ui.input} mt-1`}
              value={wearMax}
              onChange={(e) => setWearMax(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
            <span className="mt-0.5 block text-xs text-stone-400">{(wearMax / 100).toFixed(1)}%</span>
          </label>
          <label className="flex items-center gap-2 self-end pb-1">
            <input
              type="checkbox"
              checked={wearLocked}
              onChange={(e) => setWearLocked(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-stone-700">Lock studio editing</span>
          </label>
        </div>
        <button
          type="button"
          className={`${ui.buttonPrimary} mt-4`}
          disabled={saving}
          onClick={() => void saveWearPricing()}
        >
          Save wearables pricing
        </button>
      </div>
    </div>
  );
}
