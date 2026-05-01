"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateWearPrice, formatWearMarginPercentFromBps } from "@/lib/wear-commission";
import { formatWearMoney } from "@/lib/wear-money";
import { ui } from "@/lib/ui-styles";

export type WearProductPricingRow = {
  id: string;
  name: string;
  slug: string;
  supplyCostCents: number | null;
  internalMarkupPercent: number | null;
};

type Props = {
  initial: WearProductPricingRow[];
  defaultMarginBps: number;
  internalPricingOn: boolean;
};

function eurStringFromCents(cents: number | null): string {
  if (cents == null || cents < 0) return "";
  return String(cents / 100);
}

function parseEurToCents(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function parsePct(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

export function WearProductCostMarkupTable({ initial, defaultMarginBps, internalPricingOn }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(() =>
    initial.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      costEur: eurStringFromCents(r.supplyCostCents),
      markupPct: r.internalMarkupPercent != null ? String(r.internalMarkupPercent) : "",
    })),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const previews = useMemo(() => {
    return rows.map((r) => {
      const costCents = parseEurToCents(r.costEur);
      const pct = parsePct(r.markupPct);
      if (costCents == null || costCents <= 0 || pct == null) {
        return { listCents: null as number | null, shelfCents: null as number | null };
      }
      const listCents = Math.max(0, Math.round(costCents * (1 + pct / 100)));
      const shelfCents = internalPricingOn ? calculateWearPrice(listCents, defaultMarginBps) : listCents;
      return { listCents, shelfCents };
    });
  }, [rows, defaultMarginBps, internalPricingOn]);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const updates = rows.map((r) => ({
        productId: r.id,
        supplyCostCents: parseEurToCents(r.costEur),
        internalMarkupPercent: parsePct(r.markupPct),
      }));
      const res = await fetch("/api/admin/wear-product-pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not save");
      setMsg("Product costs and markups saved.");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-950">Per product — your cost × markup %</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Enter what each SKU costs you (EUR) and your markup on that cost. When both are set, the internal list price is{" "}
            <strong>COGS × (1 + markup ÷ 100)</strong> and overrides category rules for that product. Leave markup empty to
            fall back to category rules. Customer shelf also adds the default platform margin (
            {formatWearMarginPercentFromBps(defaultMarginBps)}) when internal pricing is on.
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-stone-200">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-600">
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Your cost (€)</th>
              <th className="px-3 py-2">Markup %</th>
              <th className="px-3 py-2">Internal list</th>
              {internalPricingOn ? <th className="px-3 py-2">Customer shelf</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const pv = previews[i]!;
              return (
                <tr key={r.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium text-stone-900">{r.name}</div>
                    <Link href={`/wear/${r.slug}`} className="text-xs text-amber-900 underline-offset-2 hover:underline">
                      View on shop
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      className={`${ui.input} w-28 bg-white text-stone-950 tabular-nums`}
                      inputMode="decimal"
                      value={r.costEur}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, costEur: v } : x)));
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      className={`${ui.input} w-24 bg-white text-stone-950 tabular-nums`}
                      inputMode="decimal"
                      placeholder="—"
                      value={r.markupPct}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, markupPct: v } : x)));
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 align-top tabular-nums text-stone-700">
                    {pv.listCents != null ? formatWearMoney(pv.listCents, "EUR") : "—"}
                  </td>
                  {internalPricingOn ? (
                    <td className="px-3 py-2 align-top tabular-nums text-stone-900">
                      {pv.shelfCents != null ? formatWearMoney(pv.shelfCents, "EUR") : "—"}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="button" disabled={busy} onClick={() => void save()} className={`${ui.buttonPrimary} mt-5`}>
        {busy ? "Saving…" : "Save product costs & markups"}
      </button>
      {msg ? <p className="mt-3 text-sm text-stone-600">{msg}</p> : null}
    </section>
  );
}
