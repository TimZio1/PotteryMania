"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";
import { calculateWearPrice, formatWearMarginPercentFromBps, type WearGlobalPricingConfig } from "@/lib/wear-commission";
import { WEAR_CATEGORIES, WEAR_CATEGORY_LABELS, type WearCategory } from "@/lib/wear-categories";
import type { WearInternalPricingConfig, WearInternalPricingRule } from "@/lib/wear-internal-pricing";

type Props = {
  initial: WearInternalPricingConfig;
  globalPricing: WearGlobalPricingConfig;
  /** When false, calculator still shows internal list but skips platform margin row. */
  internalPricingOn: boolean;
};

type RuleDraft = Record<WearCategory, { type: "fixed" | "percent"; value: string }>;

function ruleValue(rule: WearInternalPricingRule) {
  return rule.type === "fixed" ? String(rule.valueEur) : String(rule.value);
}

function previewListEur(costStr: string, rule: WearInternalPricingRule): string {
  const c = Number(costStr.replace(",", "."));
  if (!Number.isFinite(c) || c < 0) return "€0.00";
  const costCents = Math.round(c * 100);
  const listCents =
    rule.type === "fixed"
      ? costCents + Math.round(rule.valueEur * 100)
      : costCents + Math.round((costCents * rule.value) / 100);
  return `€${(Math.max(0, listCents) / 100).toFixed(2)}`;
}

function internalListCentsFromSample(costEur: number, rule: WearInternalPricingRule): number {
  const costCents = Math.round(Math.max(0, costEur) * 100);
  if (rule.type === "fixed") return costCents + Math.round(rule.valueEur * 100);
  return costCents + Math.round((costCents * rule.value) / 100);
}

function emptyFormState(initial: WearInternalPricingConfig): {
  fallbacks: Record<WearCategory, string>;
  rules: RuleDraft;
} {
  const fallbacks = {} as Record<WearCategory, string>;
  const rules = {} as RuleDraft;
  for (const key of WEAR_CATEGORIES) {
    fallbacks[key] = String(initial.fallbackCostsEur[key]);
    rules[key] = { type: initial.rules[key].type, value: ruleValue(initial.rules[key]) };
  }
  return { fallbacks, rules };
}

export function WearRetailPricingForm({ initial, globalPricing, internalPricingOn }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(() => emptyFormState(initial));
  const { fallbacks: fallbackCosts, rules } = form;

  const [wearDefault, setWearDefault] = useState(globalPricing.defaultMarginBps);
  const [wearMin, setWearMin] = useState(globalPricing.minMarginBps);
  const [wearMax, setWearMax] = useState(globalPricing.maxMarginBps);
  const [wearLocked, setWearLocked] = useState(globalPricing.marginLocked);
  const [sampleCostEur, setSampleCostEur] = useState("10");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function buildRule(key: WearCategory): WearInternalPricingRule {
    const value = Math.max(0, Number(rules[key].value.replace(",", ".")) || 0);
    return rules[key].type === "percent" ? { type: "percent", value } : { type: "fixed", valueEur: value };
  }

  const sampleCostNum = Number(sampleCostEur.replace(",", "."));
  const sampleCostOk = Number.isFinite(sampleCostNum) && sampleCostNum >= 0;

  const calculatorRows = useMemo(() => {
    return WEAR_CATEGORIES.map((key) => {
      const rule = buildRule(key);
      const listCents = sampleCostOk ? internalListCentsFromSample(sampleCostNum, rule) : 0;
      const shelfCents = internalPricingOn ? calculateWearPrice(listCents, wearDefault) : listCents;
      return { key, label: WEAR_CATEGORY_LABELS[key], listCents, shelfCents };
    });
  }, [rules, sampleCostNum, sampleCostOk, wearDefault, internalPricingOn]);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const retail: WearInternalPricingConfig = {
        fallbackCostsEur: {} as WearInternalPricingConfig["fallbackCostsEur"],
        rules: {} as WearInternalPricingConfig["rules"],
      };
      for (const key of WEAR_CATEGORIES) {
        retail.fallbackCostsEur[key] = Math.max(0, Number(fallbackCosts[key].replace(",", ".")) || 0);
        retail.rules[key] = buildRule(key);
      }
      const res = await fetch("/api/admin/wear-pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retail,
          defaultMarginBps: wearDefault,
          minMarginBps: wearMin,
          maxMarginBps: wearMax,
          marginLocked: wearLocked,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not save pricing");
      setMsg("Pricing saved. Storefront and checkout use these rules.");
      router.refresh();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not save pricing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-950">Direct checkout margin</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Applied on top of the internal list price for shoppers who are not on an affiliate link. Affiliate orders use
              each partner&apos;s configured margin within min/max unless locked.
            </p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950">
            Platform {formatWearMarginPercentFromBps(wearDefault)}
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm text-stone-700">
            Default markup (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={`${ui.input} mt-1 bg-white text-stone-950`}
              value={Number.isFinite(wearDefault / 100) ? wearDefault / 100 : 0}
              onChange={(e) =>
                setWearDefault(Math.max(0, Math.min(10000, Math.round((parseFloat(e.target.value) || 0) * 100))))
              }
            />
            <span className="mt-0.5 block text-xs text-stone-500">{wearDefault} bps</span>
          </label>
          <label className="block text-sm text-stone-700">
            Min affiliate (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={`${ui.input} mt-1 bg-white text-stone-950`}
              value={Number.isFinite(wearMin / 100) ? wearMin / 100 : 0}
              onChange={(e) =>
                setWearMin(Math.max(0, Math.min(10000, Math.round((parseFloat(e.target.value) || 0) * 100))))
              }
            />
            <span className="mt-0.5 block text-xs text-stone-500">{wearMin} bps</span>
          </label>
          <label className="block text-sm text-stone-700">
            Max affiliate (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={`${ui.input} mt-1 bg-white text-stone-950`}
              value={Number.isFinite(wearMax / 100) ? wearMax / 100 : 0}
              onChange={(e) =>
                setWearMax(Math.max(0, Math.min(10000, Math.round((parseFloat(e.target.value) || 0) * 100))))
              }
            />
            <span className="mt-0.5 block text-xs text-stone-500">{wearMax} bps</span>
          </label>
          <label className="flex items-center gap-2 self-end pb-1 text-sm text-stone-800">
            <input
              type="checkbox"
              checked={wearLocked}
              onChange={(e) => setWearLocked(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
            />
            Lock partner margin editing
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-950">Category markup (COGS → internal list)</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Categories match the shop (tops, hoodies, headwear, accessories, other) using the same text signals as the
              storefront. Fallback cost is only for manual or non-linked SKUs without production cost; linked products
              without b2b cost keep their saved Spreadconnect retail until cost sync.
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
            Per category
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {WEAR_CATEGORIES.map((key) => {
            const label = WEAR_CATEGORY_LABELS[key];
            const rule = buildRule(key);
            const fc = Number(fallbackCosts[key].replace(",", ".")) || 0;
            const listPreviewCents = internalListCentsFromSample(fc, rule);
            const shelfPreviewCents = internalPricingOn ? calculateWearPrice(listPreviewCents, wearDefault) : listPreviewCents;
            return (
              <div key={key} className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <h3 className="font-semibold text-stone-950">{label}</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="block text-sm text-stone-700">
                    Fallback cost (€)
                    <input
                      className={`${ui.input} mt-1 bg-white text-stone-950`}
                      inputMode="decimal"
                      value={fallbackCosts[key]}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          fallbacks: { ...prev.fallbacks, [key]: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm text-stone-700">
                    Markup type
                    <select
                      className={`${ui.select} mt-1 bg-white text-stone-950`}
                      value={rules[key].type}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          rules: {
                            ...prev.rules,
                            [key]: { ...prev.rules[key], type: e.target.value as "fixed" | "percent" },
                          },
                        }))
                      }
                    >
                      <option value="fixed">Fixed €</option>
                      <option value="percent">Percent %</option>
                    </select>
                  </label>
                  <label className="block text-sm text-stone-700">
                    Markup
                    <input
                      className={`${ui.input} mt-1 bg-white text-stone-950`}
                      inputMode="decimal"
                      value={rules[key].value}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          rules: { ...prev.rules, [key]: { ...prev.rules[key], value: e.target.value } },
                        }))
                      }
                    />
                  </label>
                </div>
                <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm text-stone-700">
                  If fallback cost is <strong>€{fallbackCosts[key] || "0"}</strong>, internal list becomes{" "}
                  <strong>{previewListEur(fallbackCosts[key], rule)}</strong>
                  {internalPricingOn ? (
                    <>
                      {" "}
                      → shelf <strong>€{(shelfPreviewCents / 100).toFixed(2)}</strong> after default margin.
                    </>
                  ) : null}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-stone-950">Calculator</p>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Enter a sample production cost (€). The table shows internal list price from your rules, then the customer shelf
          price after the default platform margin{internalPricingOn ? "" : " (internal pricing off — list only)"}.
        </p>
        <label className="mt-4 block max-w-xs text-sm text-stone-700">
          Sample COGS (€)
          <input
            className={`${ui.input} mt-1 bg-white text-stone-950`}
            inputMode="decimal"
            value={sampleCostEur}
            onChange={(e) => setSampleCostEur(e.target.value)}
          />
        </label>
        <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
          <table className="min-w-[520px] w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-600">
              <tr>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Internal list</th>
                {internalPricingOn ? (
                  <th className="px-3 py-2">Shelf (after {formatWearMarginPercentFromBps(wearDefault)})</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {calculatorRows.map((row) => (
                <tr key={row.key} className="border-b border-stone-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-stone-900">{row.label}</td>
                  <td className="px-3 py-2 tabular-nums text-stone-700">
                    {sampleCostOk ? `€${(row.listCents / 100).toFixed(2)}` : "—"}
                  </td>
                  {internalPricingOn ? (
                    <td className="px-3 py-2 tabular-nums text-stone-900">
                      {sampleCostOk ? `€${(row.shelfCents / 100).toFixed(2)}` : "—"}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <button type="button" disabled={busy} onClick={() => void save()} className={`${ui.buttonPrimary}`}>
        {busy ? "Saving…" : "Save all pricing"}
      </button>
      {msg ? <p className="text-sm text-stone-600">{msg}</p> : null}
    </div>
  );
}
