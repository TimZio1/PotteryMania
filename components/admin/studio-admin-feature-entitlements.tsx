"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

export type StudioFeatureEntitlementRow = {
  featureId: string;
  slug: string;
  name: string;
  grantByDefault: boolean;
  platformActive: boolean;
  isPaidAddOn: boolean;
  activation: { status: string; overridePriceCents: number | null } | null;
  accessEffective: boolean;
};

type Props = { studioId: string; rows: StudioFeatureEntitlementRow[] };

export function StudioAdminFeatureEntitlements({ studioId, rows }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function patch(featureId: string, body: Record<string, unknown>) {
    setBusyId(featureId);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/studios/${studioId}/feature-activations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureId, ...body }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Update failed");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={`${ui.cardMuted} space-y-3`}>
      <h2 className="text-sm font-semibold text-amber-950">Platform add-ons</h2>
      <p className="text-xs text-stone-500">
        Grant or revoke access without Stripe (cancels an existing add-on subscription if one exists). Override price is
        stored for ops reference; billing still uses the catalog Stripe price until further integration.
      </p>
      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Feature</th>
              <th className="px-3 py-2">Access</th>
              <th className="px-3 py-2">Admin</th>
              <th className="min-w-[140px] px-3 py-2">Override € / mo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r) => {
              const busy = busyId === r.featureId;
              const eur =
                r.activation?.overridePriceCents != null
                  ? (r.activation.overridePriceCents / 100).toFixed(2)
                  : "";
              return (
                <tr key={r.featureId} className="align-top">
                  <td className="px-3 py-2">
                    <p className="font-medium text-amber-950">{r.name}</p>
                    <code className="text-xs text-stone-500">{r.slug}</code>
                  </td>
                  <td className="px-3 py-2 text-stone-700">
                    {!r.platformActive ? (
                      <span className="text-stone-500">Catalog off</span>
                    ) : r.grantByDefault ? (
                      <span className="text-emerald-800">Included for all studios</span>
                    ) : (
                      <>
                        <span className={r.accessEffective ? "font-medium text-emerald-800" : "text-stone-600"}>
                          {r.accessEffective ? "On" : "Off"}
                        </span>
                        {r.activation ? (
                          <span className="ml-1 text-xs text-stone-500">({r.activation.status})</span>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {!r.platformActive || r.grantByDefault ? (
                      <span className="text-xs text-stone-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          className={cn(ui.buttonSecondary, "min-h-9 px-2 py-1 text-xs")}
                          onClick={() => void patch(r.featureId, { status: "active" })}
                        >
                          Grant
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className={cn(
                            "min-h-9 rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-800 hover:bg-stone-50",
                            busy && "opacity-50",
                          )}
                          onClick={() => void patch(r.featureId, { status: "inactive" })}
                        >
                          Revoke
                        </button>
                        {r.isPaidAddOn ? (
                          <span className="w-full text-[11px] text-stone-500">Paid catalog — grant bypasses Checkout</span>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {!r.platformActive ? (
                      <span className="text-xs text-stone-400">—</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <input
                          key={`${r.featureId}-${eur}`}
                          type="number"
                          min={0}
                          step={0.01}
                          disabled={busy}
                          placeholder="—"
                          defaultValue={eur || ""}
                          className={cn(ui.input, "min-h-9 w-full max-w-[120px] py-1 font-mono text-xs")}
                          onBlur={(ev) => {
                            const raw = ev.target.value.trim();
                            if (!raw.length) {
                              if (r.activation?.overridePriceCents == null) return;
                              void patch(r.featureId, { overridePriceCents: null });
                              return;
                            }
                            const v = Number(raw);
                            if (!Number.isFinite(v) || v < 0) return;
                            const cents = Math.round(v * 100);
                            if (cents === (r.activation?.overridePriceCents ?? null)) return;
                            void patch(r.featureId, { overridePriceCents: cents });
                          }}
                        />
                        <span className="text-[11px] text-stone-500">Blur to save; empty clears</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone-500">
        Catalog:{" "}
        <Link href="/admin/platform-features" className="text-amber-900 underline">
          Platform add-ons
        </Link>
      </p>
    </section>
  );
}
