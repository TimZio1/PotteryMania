"use client";

import { useEffect, useState } from "react";

type Row = { name: string; ok: boolean; ms: number; detail?: string };

export function SystemHealthPings() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function ping(path: string, name: string): Promise<Row> {
      const t0 = performance.now();
      try {
        const r = await fetch(path, { cache: "no-store" });
        const ms = Math.round(performance.now() - t0);
        if (!r.ok) return { name, ok: false, ms, detail: String(r.status) };
        return { name, ok: true, ms };
      } catch (e) {
        const ms = Math.round(performance.now() - t0);
        return { name, ok: false, ms, detail: e instanceof Error ? e.message : "error" };
      }
    }
    void (async () => {
      const out = await Promise.all([
        ping("/api/health", "Health JSON"),
        ping("/api/auth/session", "Auth session"),
      ]);
      if (!cancelled) setRows(out);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rows) return <p className="text-sm text-stone-600">Pinging public endpoints…</p>;

  return (
    <ul className="mt-3 space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2">
          <span className="font-medium text-stone-900">{r.name}</span>
          <span className={r.ok ? "text-emerald-700" : "text-rose-700"}>
            {r.ok ? "OK" : "Fail"}
            {r.detail ? ` · ${r.detail}` : ""} · {r.ms}ms
          </span>
        </li>
      ))}
    </ul>
  );
}
