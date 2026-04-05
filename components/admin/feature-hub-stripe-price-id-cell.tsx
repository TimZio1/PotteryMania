"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

export function FeatureHubStripePriceIdCell({
  featureId,
  stripePriceId,
}: {
  featureId: string;
  stripePriceId: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(stripePriceId ?? "");
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setDraft(stripePriceId ?? "");
  }, [stripePriceId]);

  async function save() {
    const t = draft.trim();
    const nextVal = t.length === 0 ? null : t;
    if (nextVal != null && !nextVal.startsWith("price_")) {
      setHint("Must start with price_");
      return;
    }
    const cur = (stripePriceId ?? "").trim();
    const curNorm = cur.length ? cur : null;
    if (nextVal === curNorm) {
      setHint(null);
      return;
    }
    setPending(true);
    setHint(null);
    const res = await fetch(`/api/admin/platform-features/${featureId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stripePriceId: nextVal }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      feature?: { stripePriceId?: string | null };
    };
    setPending(false);
    if (!res.ok) {
      setHint(typeof data.error === "string" ? data.error : "Failed");
      return;
    }
    const sp = data.feature?.stripePriceId;
    setDraft(sp?.trim() ? sp : "");
    router.refresh();
  }

  return (
    <div className="flex min-w-[6.5rem] max-w-[11rem] flex-col gap-0.5">
      <input
        type="text"
        disabled={pending}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="price_…"
        spellCheck={false}
        autoComplete="off"
        className={cn(ui.input, "min-h-8 py-1 font-mono text-[11px]")}
        aria-label="Stripe recurring price id"
        title="Stripe Price id (recurring). Empty clears. Save on blur or Enter."
      />
      {hint ? <span className="text-[10px] text-stone-500">{hint}</span> : null}
    </div>
  );
}
