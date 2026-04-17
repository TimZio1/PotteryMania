"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PLATFORM_COMMISSION_BPS } from "@/lib/commission-defaults";
import { ui } from "@/lib/ui-styles";
import type { StudioPlanKey, StudioPlanPricingConfig } from "@/lib/studio-plan-pricing";
import type { TierCommissionMatrix } from "@/lib/studio-plan-pricing-config";

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

type StudioPricingPayload = {
  planPricing: StudioPlanPricingConfig;
  tierCommission: TierCommissionMatrix;
};

const PLAN_KEYS: StudioPlanKey[] = ["bookings", "shop", "both", "pro"];

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
  const [planPricing, setPlanPricing] = useState<StudioPlanPricingConfig>({
    bookings: { monthlyCents: 1900, annualMonthlyEquivalentCents: 1600 },
    shop: { monthlyCents: 1900, annualMonthlyEquivalentCents: 1600 },
    both: { monthlyCents: 2900, annualMonthlyEquivalentCents: 2400 },
    pro: { monthlyCents: 5900, annualMonthlyEquivalentCents: 4900 },
  });
  const [tierCommission, setTierCommission] = useState<TierCommissionMatrix>({
    bookings: { productBps: DEFAULT_PLATFORM_COMMISSION_BPS, bookingBps: DEFAULT_PLATFORM_COMMISSION_BPS },
    shop: { productBps: DEFAULT_PLATFORM_COMMISSION_BPS, bookingBps: DEFAULT_PLATFORM_COMMISSION_BPS },
    both: { productBps: DEFAULT_PLATFORM_COMMISSION_BPS, bookingBps: DEFAULT_PLATFORM_COMMISSION_BPS },
    pro: { productBps: DEFAULT_PLATFORM_COMMISSION_BPS, bookingBps: DEFAULT_PLATFORM_COMMISSION_BPS },
  });

  async function load() {
    setLoading(true);
    try {
      const [commR, wearR, studioPricingR] = await Promise.all([
        fetch("/api/admin/commission", { cache: "no-store" }),
        fetch("/api/admin/wear-pricing", { cache: "no-store" }),
        fetch("/api/admin/studio-pricing", { cache: "no-store" }),
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
      if (studioPricingR.ok) {
        const sp = (await studioPricingR.json()) as StudioPricingPayload;
        setPlanPricing(sp.planPricing);
        setTierCommission(sp.tierCommission);
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

  async function saveStudioPricing() {
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/studio-pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planPricing, tierCommission }),
      });
      const j = await r.json().catch(() => ({} as { error?: string }));
      if (!r.ok) throw new Error(j.error ?? "Failed to update studio tier pricing");
      await load();
      setMsg("Studio tier pricing and commission matrix updated.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not update studio tier pricing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {msg ? <p className="text-sm text-[var(--muted)]">{msg}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Loading commission settings…</p> : null}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-[var(--foreground)]">Global platform commission</p>
        <p className="mt-2 text-sm text-[var(--foreground)]">Define baseline fees for product sales and class bookings.</p>
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
        <p className="text-sm font-semibold text-[var(--foreground)]">Per-studio override</p>
        <p className="mt-2 text-sm text-[var(--foreground)]">Override commission for a specific studio and item type.</p>
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
            <p className="text-xs text-[var(--muted)]">No active overrides.</p>
          ) : (
            overrides.map((row) => (
              <div key={row.id} className="rounded-lg border border-stone-200 px-3 py-2 text-xs text-[var(--foreground)]">
                <span className="font-medium">{row.studioName}</span> ({row.studioId}) · {row.itemType} ·{" "}
                {(row.percentageBasisPoints / 100).toFixed(2)}%
              </div>
            ))
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-[var(--foreground)]">Tier pricing and commission matrix</p>
        <p className="mt-2 text-sm text-[var(--foreground)]">
          Edit monthly/annual tier prices and default commission rates by tier. Studio-specific overrides still take priority.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[860px] w-full text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[var(--muted)]">
                <th className="px-2 py-2 font-semibold uppercase tracking-wide">Tier</th>
                <th className="px-2 py-2 font-semibold uppercase tracking-wide">Monthly (cents)</th>
                <th className="px-2 py-2 font-semibold uppercase tracking-wide">Annual eq. (cents)</th>
                <th className="px-2 py-2 font-semibold uppercase tracking-wide">Product commission (bps)</th>
                <th className="px-2 py-2 font-semibold uppercase tracking-wide">Booking commission (bps)</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_KEYS.map((key) => (
                <tr key={key} className="border-b border-stone-100">
                  <td className="px-2 py-2 font-semibold text-[var(--foreground)]">{key}</td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      className={ui.input}
                      value={planPricing[key].monthlyCents}
                      onChange={(e) =>
                        setPlanPricing((prev) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            monthlyCents: Math.max(0, parseInt(e.target.value, 10) || 0),
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      className={ui.input}
                      value={planPricing[key].annualMonthlyEquivalentCents}
                      onChange={(e) =>
                        setPlanPricing((prev) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            annualMonthlyEquivalentCents: Math.max(0, parseInt(e.target.value, 10) || 0),
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      className={ui.input}
                      value={tierCommission[key].productBps}
                      onChange={(e) =>
                        setTierCommission((prev) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            productBps: Math.max(0, Math.min(10000, parseInt(e.target.value, 10) || 0)),
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      className={ui.input}
                      value={tierCommission[key].bookingBps}
                      onChange={(e) =>
                        setTierCommission((prev) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            bookingBps: Math.max(0, Math.min(10000, parseInt(e.target.value, 10) || 0)),
                          },
                        }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className={`${ui.buttonPrimary} mt-4`} disabled={saving} onClick={() => void saveStudioPricing()}>
          Save tier pricing and commission matrix
        </button>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-[var(--foreground)]">Wearables — studio margin controls</p>
        <p className="mt-2 text-sm text-[var(--foreground)]">
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
            <span className="text-sm text-[var(--foreground)]">Lock studio editing</span>
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
