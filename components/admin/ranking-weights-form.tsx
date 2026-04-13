"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type Props = {
  initial: { performance: number; activity: number; manual: number };
};

export function RankingWeightsForm({ initial }: Props) {
  const router = useRouter();
  const [perf, setPerf] = useState(String(Math.round(initial.performance * 1000) / 1000));
  const [act, setAct] = useState(String(Math.round(initial.activity * 1000) / 1000));
  const [man, setMan] = useState(String(Math.round(initial.manual * 1000) / 1000));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    const performance = Number(perf);
    const activity = Number(act);
    const manual = Number(man);
    if (![performance, activity, manual].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) {
      setMsg("Each weight must be a number between 0 and 1.");
      return;
    }
    if (reason.trim().length < 3) {
      setMsg("Audit reason (min 3 characters) required.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/settings/ranking-weights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ performance, activity, manual, reason: reason.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Save failed");
        return;
      }
      setReason("");
      setMsg("Saved. Run ranking cron to refresh scores with new weights.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${ui.card} space-y-4`}>
      <h2 className="text-lg font-semibold text-amber-950">Ranking score weights</h2>
      <p className="text-sm text-stone-600">
        Performance / activity / manual components for the platform discovery score (normalized to sum to 1). Defaults
        0.7 / 0.2 / 0.1.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-stone-700">
          Performance (0–1)
          <input className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2" value={perf} onChange={(e) => setPerf(e.target.value)} />
        </label>
        <label className="text-sm text-stone-700">
          Activity (0–1)
          <input className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2" value={act} onChange={(e) => setAct(e.target.value)} />
        </label>
        <label className="text-sm text-stone-700">
          Manual (0–1)
          <input className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2" value={man} onChange={(e) => setMan(e.target.value)} />
        </label>
      </div>
      <label className="block text-sm text-stone-700">
        Audit reason
        <input
          className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why change weights?"
        />
      </label>
      {msg ? <p className="text-sm text-amber-900">{msg}</p> : null}
      <button type="button" disabled={busy} className={ui.buttonSecondary} onClick={() => void save()}>
        {busy ? "Saving…" : "Save weights"}
      </button>
    </div>
  );
}
