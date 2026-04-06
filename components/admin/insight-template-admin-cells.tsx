"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

function formatMajor(cents: number) {
  return (cents / 100).toFixed(2);
}

export function InsightTemplatePriceCell({ templateId, basePriceCents }: { templateId: string; basePriceCents: number }) {
  const router = useRouter();
  const [draft, setDraft] = useState(formatMajor(basePriceCents));
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setDraft(formatMajor(basePriceCents));
  }, [basePriceCents]);

  async function save() {
    const v = Number(draft);
    if (!Number.isFinite(v) || v < 0) {
      setHint("Invalid");
      return;
    }
    const nextCents = Math.round(v * 100);
    if (nextCents === basePriceCents) {
      setHint(null);
      return;
    }
    setPending(true);
    setHint(null);
    const res = await fetch(`/api/admin/insight-templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ basePriceCents: nextCents }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; template?: { basePriceCents?: number } };
    setPending(false);
    if (!res.ok) {
      setHint(typeof data.error === "string" ? data.error : "Failed");
      return;
    }
    const pc = data.template?.basePriceCents;
    if (typeof pc === "number") setDraft(formatMajor(pc));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="text-stone-500">€</span>
        <input
          className={cn(ui.input, "max-w-[6.5rem] py-1.5 text-sm")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          disabled={pending}
        />
      </div>
      {hint ? <p className="text-xs text-rose-600">{hint}</p> : null}
    </div>
  );
}

export function InsightTemplateActiveCell({ templateId, isActive }: { templateId: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const res = await fetch(`/api/admin/insight-templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={isActive} disabled={pending} onChange={() => void toggle()} />
      <span className="text-stone-700">{isActive ? "On" : "Off"}</span>
    </label>
  );
}
