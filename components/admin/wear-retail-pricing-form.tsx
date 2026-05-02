"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";
import { formatWearMarginPercentFromBps, type WearGlobalPricingConfig } from "@/lib/wear-commission";
import { WEAR_CATEGORIES, WEAR_CATEGORY_LABELS, type WearCategory } from "@/lib/wear-categories";
import type { WearInternalPricingConfig, WearInternalPricingRule } from "@/lib/wear-internal-pricing";
import type { WearSpreadconnectTypeStat } from "@/lib/wear-spreadconnect-type-stats";

type Props = {
  initial: WearInternalPricingConfig;
  spreadconnectTypeStats: WearSpreadconnectTypeStat[];
  globalPricing: WearGlobalPricingConfig;
  internalPricingOn: boolean;
};

type RuleDraft = { type: "fixed" | "percent"; value: string };

function ruleValue(rule: WearInternalPricingRule) {
  return rule.type === "fixed" ? String(rule.valueEur) : String(rule.value);
}

function internalListCentsFromSample(costEur: number, rule: WearInternalPricingRule): number {
  const costCents = Math.round(Math.max(0, costEur) * 100);
  if (rule.type === "fixed") return costCents + Math.round(rule.valueEur * 100);
  return costCents + Math.round((costCents * rule.value) / 100);
}

function emptyCategoryRulesState(initial: WearInternalPricingConfig): Record<WearCategory, RuleDraft> {
  const rules = {} as Record<WearCategory, RuleDraft>;
  for (const key of WEAR_CATEGORIES) {
    rules[key] = { type: initial.rules[key].type, value: ruleValue(initial.rules[key]) };
  }
  return rules;
}

function emptyTypeRulesState(
  stats: WearSpreadconnectTypeStat[],
  saved: Record<string, WearInternalPricingRule> | undefined,
): Record<string, RuleDraft> {
  const out: Record<string, RuleDraft> = {};
  const def: WearInternalPricingRule = { type: "fixed", valueEur: 10 };
  for (const row of stats) {
    const r = saved?.[row.key];
    out[row.key] = r ? { type: r.type, value: ruleValue(r) } : { type: def.type, value: ruleValue(def) };
  }
  return out;
}

function formatStatEur(cents: number | null) {
  if (cents == null) return "—";
  return `€${(cents / 100).toFixed(2)}`;
}

export function WearRetailPricingForm({
  initial,
  spreadconnectTypeStats,
  globalPricing,
  internalPricingOn,
}: Props) {
  const router = useRouter();
  const [categoryRules, setCategoryRules] = useState(() => emptyCategoryRulesState(initial));
  const [typeRules, setTypeRules] = useState(() => emptyTypeRulesState(spreadconnectTypeStats, initial.rulesByProductType));

  const [wearDefault, setWearDefault] = useState(globalPricing.defaultMarginBps);
  const [wearMin, setWearMin] = useState(globalPricing.minMarginBps);
  const [wearMax, setWearMax] = useState(globalPricing.maxMarginBps);
  const [wearLocked, setWearLocked] = useState(globalPricing.marginLocked);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function buildRuleFromDraft(draft: RuleDraft): WearInternalPricingRule {
    const value = Math.max(0, Number(draft.value.replace(",", ".")) || 0);
    return draft.type === "percent" ? { type: "percent", value } : { type: "fixed", valueEur: value };
  }

  function buildCategoryRule(key: WearCategory): WearInternalPricingRule {
    return buildRuleFromDraft(categoryRules[key]);
  }

  function buildTypeRule(key: string): WearInternalPricingRule {
    const draft = typeRules[key];
    if (!draft) return { type: "fixed", valueEur: 10 };
    return buildRuleFromDraft(draft);
  }

  const typePreviewRows = useMemo(() => {
    return spreadconnectTypeStats.map((row) => {
      const rule = buildTypeRule(row.key);
      const base = row.avgSupplyCents != null && row.avgSupplyCents > 0 ? row.avgSupplyCents / 100 : null;
      const listCents = base != null ? internalListCentsFromSample(base, rule) : null;
      return { ...row, listCents };
    });
  }, [spreadconnectTypeStats, typeRules]);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const rulesByProductType: Record<string, WearInternalPricingRule> = {};
      for (const row of spreadconnectTypeStats) {
        rulesByProductType[row.key] = buildTypeRule(row.key);
      }
      const rules = {} as WearInternalPricingConfig["rules"];
      for (const key of WEAR_CATEGORIES) {
        rules[key] = buildCategoryRule(key);
      }
      const retail: WearInternalPricingConfig = {
        fallbackCostsEur: initial.fallbackCostsEur,
        rules,
        rulesByProductType,
      };
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
      setMsg("Pricing saved. Storefront uses Spreadconnect wholesale + these markups.");
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
            <p className="text-sm font-semibold text-stone-950">Affiliate margin (default / bounds)</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Direct shoppers pay the <strong>internal list</strong> price from your COGS rules. When a purchase runs on an
              affiliate link, the partner&apos;s margin (basis points) is applied on top of that list — these fields set
              the default and min/max unless margin is locked.
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
            <p className="text-sm font-semibold text-stone-950">Spreadconnect product type → markup</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Wholesale (min / avg / max) comes from your catalog sync — blank garment plus print as one unit cost from
              Spreadconnect. Markup is your platform add-on to that real COGS. Preview uses <strong>average</strong>{" "}
              wholesale per type when available — same amount shoppers see on the shop (internal list only; affiliate
              links add partner margin separately).
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
            By SPOD type
          </span>
        </div>

        {spreadconnectTypeStats.length === 0 ? (
          <p className="mt-4 text-sm text-stone-600">No products in catalog — sync wear products first.</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-stone-200">
            <table className="min-w-[880px] w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-3 py-2">Spreadconnect type</th>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Wholesale min</th>
                  <th className="px-3 py-2">Avg</th>
                  <th className="px-3 py-2">Max</th>
                  <th className="px-3 py-2">Markup</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">Shop price</th>
                </tr>
              </thead>
              <tbody>
                {typePreviewRows.map((row) => (
                  <tr key={row.key} className="border-b border-stone-100 last:border-0">
                    <td className="px-3 py-2 font-medium text-stone-900">{row.displayLabel}</td>
                    <td className="px-3 py-2 tabular-nums text-stone-600">{row.productCount}</td>
                    <td className="px-3 py-2 tabular-nums text-stone-700">{formatStatEur(row.minSupplyCents)}</td>
                    <td className="px-3 py-2 tabular-nums text-stone-700">{formatStatEur(row.avgSupplyCents)}</td>
                    <td className="px-3 py-2 tabular-nums text-stone-700">{formatStatEur(row.maxSupplyCents)}</td>
                    <td className="px-3 py-2">
                      <select
                        className={`${ui.select} bg-white text-stone-950`}
                        value={typeRules[row.key]?.type ?? "fixed"}
                        onChange={(e) =>
                          setTypeRules((prev) => ({
                            ...prev,
                            [row.key]: { ...prev[row.key]!, type: e.target.value as "fixed" | "percent" },
                          }))
                        }
                      >
                        <option value="fixed">Fixed €</option>
                        <option value="percent">Percent %</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={`${ui.input} w-24 bg-white text-stone-950 tabular-nums`}
                        inputMode="decimal"
                        value={typeRules[row.key]?.value ?? ""}
                        onChange={(e) =>
                          setTypeRules((prev) => ({
                            ...prev,
                            [row.key]: { ...prev[row.key]!, value: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-stone-900">
                      {row.listCents != null ? `€${(row.listCents / 100).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-950">Shop category defaults (markup only)</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Used when a product has <strong>no</strong> Spreadconnect type rule above, or no `spreadconnectProductTypeName`.
              COGS is still always the synced wholesale when present — these rows only choose the add-on rule.
            </p>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-stone-200">
          <table className="min-w-[520px] w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-600">
              <tr>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Markup</th>
                <th className="px-3 py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {WEAR_CATEGORIES.map((key) => (
                <tr key={key} className="border-b border-stone-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-stone-900">{WEAR_CATEGORY_LABELS[key]}</td>
                  <td className="px-3 py-2">
                    <select
                      className={`${ui.select} bg-white text-stone-950`}
                      value={categoryRules[key].type}
                      onChange={(e) =>
                        setCategoryRules((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], type: e.target.value as "fixed" | "percent" },
                        }))
                      }
                    >
                      <option value="fixed">Fixed €</option>
                      <option value="percent">Percent %</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={`${ui.input} w-28 bg-white text-stone-950 tabular-nums`}
                      inputMode="decimal"
                      value={categoryRules[key].value}
                      onChange={(e) =>
                        setCategoryRules((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], value: e.target.value },
                        }))
                      }
                    />
                  </td>
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
