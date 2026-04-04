"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

export type AdminPlatformFeatureRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  currency: string;
  isActive: boolean;
  visibility: string;
  grantByDefault: boolean;
  sortOrder: number;
};

export default function PlatformFeaturesAdminTable({ initial }: { initial: AdminPlatformFeatureRow[] }) {
  const [rows, setRows] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [rows],
  );

  async function patch(id: string, patchBody: Record<string, unknown>) {
    setPendingId(id);
    setMessage(null);
    const res = await fetch(`/api/admin/platform-features/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });
    const data = await res.json();
    setPendingId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Save failed");
      return;
    }
    if (data.feature) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.feature } : r)));
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
              <th className="px-4 py-3">Feature</th>
              <th className="px-4 py-3">Price / mo</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Grant all</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.map((f) => {
              const eur = (f.priceCents / 100).toFixed(2);
              const busy = pendingId === f.id;
              return (
                <tr key={f.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-amber-950">{f.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-stone-500">{f.slug}</p>
                    <p className="mt-2 text-xs text-stone-600">{f.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-500">{f.currency}</span>
                      <input
                        key={f.priceCents}
                        type="number"
                        min={0}
                        step={0.01}
                        defaultValue={eur}
                        disabled={busy}
                        className={cn(ui.input, "w-24 min-h-9 py-1.5 font-mono text-xs")}
                        onBlur={(ev) => {
                          const v = Number(ev.target.value);
                          if (!Number.isFinite(v) || v < 0) return;
                          const cents = Math.round(v * 100);
                          if (cents === f.priceCents) return;
                          void patch(f.id, { priceCents: cents });
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={cn(ui.input, "min-h-9 py-1.5 text-xs")}
                      disabled={busy}
                      value={f.visibility}
                      onChange={(ev) => void patch(f.id, { visibility: ev.target.value })}
                    >
                      <option value="public">public</option>
                      <option value="beta">beta</option>
                      <option value="hidden">hidden</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={f.isActive}
                        disabled={busy}
                        onChange={(ev) => void patch(f.id, { isActive: ev.target.checked })}
                      />
                      Live
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={f.grantByDefault}
                        disabled={busy}
                        onChange={(ev) => void patch(f.id, { grantByDefault: ev.target.checked })}
                      />
                      All studios
                    </label>
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
