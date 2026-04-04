"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export type FlagRow = {
  id: string;
  flagKey: string;
  flagValue: unknown;
  isActive: boolean;
};

export function FeatureFlagsPanel({ initial }: { initial: FlagRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function toggle(id: string, isActive: boolean) {
    setPendingId(id);
    setMsg("");
    try {
      const r = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Failed");
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {msg ? <p className={ui.errorText}>{msg}</p> : null}
      <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white shadow-sm">
        {initial.map((f) => (
          <li key={f.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-sm font-medium text-amber-950">{f.flagKey}</p>
              <p className="mt-1 text-xs text-stone-500">{JSON.stringify(f.flagValue)}</p>
            </div>
            <button
              type="button"
              className={f.isActive ? ui.buttonSecondary : ui.buttonPrimary}
              disabled={pendingId === f.id}
              onClick={() => toggle(f.id, f.isActive)}
            >
              {pendingId === f.id ? "…" : f.isActive ? "Turn off" : "Turn on"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
