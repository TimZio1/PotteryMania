"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

export function FeatureHubSortOrderCell({
  featureId,
  sortOrder,
}: {
  featureId: string;
  sortOrder: number;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(String(sortOrder));
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(sortOrder));
  }, [sortOrder]);

  async function save() {
    const v = Number(draft);
    if (!Number.isFinite(v)) {
      setHint("Invalid");
      return;
    }
    const next = Math.round(v);
    if (next === sortOrder) {
      setHint(null);
      return;
    }
    setPending(true);
    setHint(null);
    const res = await fetch(`/api/admin/platform-features/${featureId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortOrder: next }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; feature?: { sortOrder?: number } };
    setPending(false);
    if (!res.ok) {
      setHint(typeof data.error === "string" ? data.error : "Failed");
      return;
    }
    const so = data.feature?.sortOrder;
    if (typeof so === "number") setDraft(String(so));
    router.refresh();
  }

  return (
    <div className="flex min-w-[3.25rem] flex-col gap-0.5">
      <input
        type="number"
        step={1}
        disabled={pending}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={cn(ui.input, "min-h-8 w-[3.5rem] py-1 font-mono text-xs tabular-nums")}
        aria-label="Catalog sort order"
        title="Lower sorts first in vendor marketplace lists"
      />
      {hint ? <span className="text-[10px] text-stone-500">{hint}</span> : null}
    </div>
  );
}
