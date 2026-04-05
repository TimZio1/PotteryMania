"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

const VIS_OPTIONS = ["public", "hidden", "beta"] as const;

type ApiFeature = { isActive?: boolean; visibility?: string };

export function FeatureHubCatalogFlagsCell({
  featureId,
  isActive,
  visibility,
}: {
  featureId: string;
  isActive: boolean;
  visibility: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [vis, setVis] = useState(visibility);
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setActive(isActive);
    setVis(visibility);
  }, [isActive, visibility]);

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    setHint(null);
    const res = await fetch(`/api/admin/platform-features/${featureId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; feature?: ApiFeature };
    setPending(false);
    if (!res.ok) {
      setHint(typeof data.error === "string" ? data.error : "Failed");
      return;
    }
    const f = data.feature;
    if (typeof f?.isActive === "boolean") setActive(f.isActive);
    if (typeof f?.visibility === "string") setVis(f.visibility);
    router.refresh();
  }

  const visValue = VIS_OPTIONS.includes(vis as (typeof VIS_OPTIONS)[number]) ? vis : "public";

  return (
    <div className="flex min-w-[6.5rem] flex-col gap-1.5">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-700">
        <input
          type="checkbox"
          checked={active}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            if (next === active) return;
            void patch({ isActive: next });
          }}
          className="h-3.5 w-3.5 rounded border-stone-300 text-amber-900 focus:ring-amber-900/20"
        />
        <span>Catalog on</span>
      </label>
      <select
        value={visValue}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          if (next === visValue) return;
          void patch({ visibility: next });
        }}
        className={cn(ui.input, "min-h-8 py-1 text-xs")}
        aria-label="Catalog visibility"
      >
        {VIS_OPTIONS.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      {hint ? <span className="text-[10px] text-stone-500">{hint}</span> : null}
    </div>
  );
}
