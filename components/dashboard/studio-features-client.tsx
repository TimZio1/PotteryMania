"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type FeatureRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  preferenceOn: boolean;
  entitled: boolean;
  platformActive: boolean;
  includedForAll: boolean;
};

export default function StudioFeaturesClient({ studioId }: { studioId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studioId}/feature-requests`);
    const data = await res.json();
    if (res.ok && Array.isArray(data.features)) setRows(data.features);
    setLoading(false);
  }, [studioId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(slug: string, next: boolean) {
    const label = rows.find((r) => r.slug === slug)?.name ?? slug;
    if (
      !next &&
      !confirm("Turn off this add-on in your preferences? When billing is connected, this may end access at renewal.")
    ) {
      return;
    }
    if (next && !confirm(`Enable “${label}” in your preferences?`)) return;
    setPending(slug);
    const res = await fetch(`/api/studios/${studioId}/feature-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, active: next }),
    });
    setPending(null);
    if (res.ok) {
      await load();
      if (slug === "kiln_tracking") router.refresh();
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;

  if (!rows.length) {
    return (
      <p className="text-sm text-stone-600">
        No add-ons are configured yet. After the platform migration runs, catalog entries will appear here.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((f) => {
        const on = f.preferenceOn;
        const price = (f.priceCents / 100).toFixed(2);
        return (
          <div key={f.slug} className={ui.card}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-amber-950">{f.name}</p>
                <p className="mt-2 text-sm text-stone-600">{f.description}</p>
                <p className="mt-3 text-sm font-medium text-stone-800">
                  From {f.currency} {price}/mo <span className="text-xs font-normal text-stone-500">(indicative)</span>
                </p>
                {!f.platformActive ? (
                  <p className="mt-2 text-xs font-medium text-amber-900">Temporarily unavailable on the platform.</p>
                ) : null}
                {f.includedForAll ? (
                  <p className="mt-2 text-xs text-stone-600">
                    Included for all studios today — you already have access. The toggle records your preference for when
                    billing goes live.
                  </p>
                ) : null}
                {!f.entitled && f.platformActive ? (
                  <p className="mt-2 text-xs font-medium text-rose-800">
                    Not entitled — turn this on below (billing will apply when subscriptions are connected).
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={pending === f.slug || !f.platformActive}
                onClick={() => toggle(f.slug, !on)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                  on ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-stone-200 text-stone-800 hover:bg-stone-300"
                }`}
              >
                {on ? "On" : "Off"}
              </button>
            </div>
            {on ? (
              <p className="mt-3 text-xs text-emerald-800">
                Preference saved{f.includedForAll ? " — platform default still covers access today." : "."}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
