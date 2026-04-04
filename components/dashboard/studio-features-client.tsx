"use client";

import { useCallback, useEffect, useState } from "react";
import { ui } from "@/lib/ui-styles";
import type { StudioFeatureCatalogEntry } from "@/lib/studio-feature-catalog";

export default function StudioFeaturesClient({
  studioId,
  catalog,
}: {
  studioId: string;
  catalog: StudioFeatureCatalogEntry[];
}) {
  const [desired, setDesired] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studioId}/feature-requests`);
    const data = await res.json();
    if (res.ok) setDesired(data.desiredByKey ?? {});
    setLoading(false);
  }, [studioId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(key: string, next: boolean) {
    if (
      !next &&
      !confirm("Turn off this add-on in your preferences? Billing will follow when subscriptions are connected.")
    ) {
      return;
    }
    if (next && !confirm(`Enable “${catalog.find((c) => c.key === key)?.name}” in your preferences?`)) return;
    setPending(key);
    const res = await fetch(`/api/studios/${studioId}/feature-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureKey: key, desiredOn: next }),
    });
    setPending(null);
    if (res.ok) {
      setDesired((d) => ({ ...d, [key]: next }));
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {catalog.map((f) => {
        const on = Boolean(desired[f.key]);
        return (
          <div key={f.key} className={ui.card}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-amber-950">{f.name}</p>
                <p className="mt-2 text-sm text-stone-600">{f.benefit}</p>
                <p className="mt-3 text-sm font-medium text-stone-800">
                  From €{f.suggestedMonthlyEur.toFixed(2)}/mo <span className="text-xs font-normal text-stone-500">(indicative)</span>
                </p>
              </div>
              <button
                type="button"
                disabled={pending === f.key}
                onClick={() => toggle(f.key, !on)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                  on ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-stone-200 text-stone-800 hover:bg-stone-300"
                }`}
              >
                {on ? "On" : "Off"}
              </button>
            </div>
            {on ? <p className="mt-3 text-xs text-emerald-800">Saved as desired — platform billing will apply when available.</p> : null}
          </div>
        );
      })}
    </div>
  );
}
