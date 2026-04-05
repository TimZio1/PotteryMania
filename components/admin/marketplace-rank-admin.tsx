"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

export type MarketplaceRankRow = {
  id: string;
  displayName: string;
  city: string;
  country: string;
  status: string;
  marketplaceRankWeight: number;
};

export default function MarketplaceRankAdmin({ initial }: { initial: MarketplaceRankRow[] }) {
  const [rows, setRows] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(id: string, marketplaceRankWeight: number) {
    setPendingId(id);
    setMessage(null);
    const res = await fetch(`/api/admin/studios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketplaceRankWeight }),
    });
    const data = await res.json();
    setPendingId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Save failed");
      return;
    }
    if (data.studio) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, marketplaceRankWeight: data.studio.marketplaceRankWeight } : r)));
      setMessage("Saved.");
    }
  }

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm text-stone-600">{message}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Studio</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rank weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((s) => {
              const busy = pendingId === s.id;
              return (
                <tr key={s.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-amber-950">{s.displayName}</p>
                    <p className="text-xs text-stone-500">
                      {s.city}, {s.country}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                      <Link href={`/studios/${s.id}`} className="text-amber-900 underline">
                        Public profile →
                      </Link>
                      <Link href={`/admin/studios/${s.id}`} className="text-stone-600 underline">
                        Admin →
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-stone-600">{s.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <input
                      key={s.marketplaceRankWeight}
                      type="number"
                      defaultValue={s.marketplaceRankWeight}
                      disabled={busy}
                      step={1}
                      className={cn(ui.input, "w-28 min-h-9 py-1.5 font-mono text-xs")}
                      onBlur={(ev) => {
                        const v = Number(ev.target.value);
                        if (!Number.isFinite(v)) return;
                        const rounded = Math.round(v);
                        if (rounded === s.marketplaceRankWeight) return;
                        void save(s.id, rounded);
                      }}
                    />
                    <p className="mt-1 max-w-[200px] text-[11px] text-stone-500">
                      Higher appears first in marketplace &ldquo;Recommended&rdquo; and studio directory (default sort).
                      Range ±10&nbsp;000.
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
