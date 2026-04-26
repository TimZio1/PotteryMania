"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";
import type { WearInternalPricingConfig, WearInternalPricingRule } from "@/lib/wear-internal-pricing";

type CategoryKey = "tshirt" | "hoodie";

type Props = {
  initial: WearInternalPricingConfig;
};

function ruleValue(rule: WearInternalPricingRule) {
  return rule.type === "fixed" ? String(rule.valueEur) : String(rule.value);
}

function previewPrice(cost: string, rule: WearInternalPricingRule) {
  const c = Number(cost);
  if (!Number.isFinite(c)) return "€0.00";
  const price = rule.type === "fixed" ? c + rule.valueEur : c + (c * rule.value) / 100;
  return `€${Math.max(0, price).toFixed(2)}`;
}

export function WearRetailPricingForm({ initial }: Props) {
  const router = useRouter();
  const [fallbackCosts, setFallbackCosts] = useState<Record<CategoryKey, string>>({
    tshirt: String(initial.fallbackCostsEur.tshirt),
    hoodie: String(initial.fallbackCostsEur.hoodie),
  });
  const [rules, setRules] = useState<Record<CategoryKey, { type: "fixed" | "percent"; value: string }>>({
    tshirt: { type: initial.rules.tshirt.type, value: ruleValue(initial.rules.tshirt) },
    hoodie: { type: initial.rules.hoodie.type, value: ruleValue(initial.rules.hoodie) },
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function buildRule(key: CategoryKey): WearInternalPricingRule {
    const value = Math.max(0, Number(rules[key].value.replace(",", ".")) || 0);
    return rules[key].type === "percent" ? { type: "percent", value } : { type: "fixed", valueEur: value };
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const retail: WearInternalPricingConfig = {
        fallbackCostsEur: {
          tshirt: Math.max(0, Number(fallbackCosts.tshirt.replace(",", ".")) || 0),
          hoodie: Math.max(0, Number(fallbackCosts.hoodie.replace(",", ".")) || 0),
        },
        rules: {
          tshirt: buildRule("tshirt"),
          hoodie: buildRule("hoodie"),
        },
      };
      const res = await fetch("/api/admin/wear-pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retail }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not save apparel pricing");
      setMsg("Apparel pricing saved. Storefront prices now use these rules.");
      router.refresh();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not save apparel pricing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-950">Apparel retail pricing</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Your selling price is calculated from Spreadconnect base cost. If Spreadconnect cost is missing, the fallback
            cost below is used. These prices feed the shop, product pages, cart, and checkout.
          </p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
          Cost + markup
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(["tshirt", "hoodie"] as const).map((key) => {
          const label = key === "tshirt" ? "T-shirts" : "Hoodies";
          const rule = buildRule(key);
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
                    onChange={(e) => setFallbackCosts((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </label>
                <label className="block text-sm text-stone-700">
                  Markup type
                  <select
                    className={`${ui.select} mt-1 bg-white text-stone-950`}
                    value={rules[key].type}
                    onChange={(e) =>
                      setRules((prev) => ({ ...prev, [key]: { ...prev[key], type: e.target.value as "fixed" | "percent" } }))
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
                    onChange={(e) => setRules((prev) => ({ ...prev, [key]: { ...prev[key], value: e.target.value } }))}
                  />
                </label>
              </div>
              <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm text-stone-700">
                If cost is <strong>€{fallbackCosts[key] || "0"}</strong>, store price becomes{" "}
                <strong>{previewPrice(fallbackCosts[key], rule)}</strong>.
              </p>
            </div>
          );
        })}
      </div>

      <button type="button" disabled={busy} onClick={() => void save()} className={`${ui.buttonPrimary} mt-6`}>
        {busy ? "Saving..." : "Save apparel pricing"}
      </button>
      {msg ? <p className="mt-3 text-sm text-stone-600">{msg}</p> : null}
    </section>
  );
}
