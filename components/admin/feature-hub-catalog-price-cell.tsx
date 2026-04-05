"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

function formatMajor(cents: number) {
  return (cents / 100).toFixed(2);
}

export function FeatureHubCatalogPriceCell({
  featureId,
  priceCents,
  currency,
}: {
  featureId: string;
  priceCents: number;
  currency: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(formatMajor(priceCents));
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setDraft(formatMajor(priceCents));
  }, [priceCents]);

  async function save() {
    const v = Number(draft);
    if (!Number.isFinite(v) || v < 0) {
      setHint("Invalid");
      return;
    }
    const nextCents = Math.round(v * 100);
    if (nextCents === priceCents) {
      setHint(null);
      return;
    }
    setPending(true);
    setHint(null);
    const res = await fetch(`/api/admin/platform-features/${featureId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceCents: nextCents }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; feature?: { priceCents?: number } };
    setPending(false);
    if (!res.ok) {
      setHint(typeof data.error === "string" ? data.error : "Failed");
      return;
    }
    const pc = data.feature?.priceCents;
    if (typeof pc === "number") {
      setDraft(formatMajor(pc));
    }
    router.refresh();
  }

  return (
    <div className="flex min-w-[5.5rem] flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-stone-400">{currency}</span>
        <input
          type="number"
          min={0}
          step={0.01}
          disabled={pending}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className={cn(ui.input, "min-h-8 w-[5.25rem] py-1 font-mono text-xs tabular-nums")}
          aria-label="Catalog list price"
        />
      </div>
      {hint ? <span className="text-[10px] text-stone-500">{hint}</span> : null}
    </div>
  );
}
