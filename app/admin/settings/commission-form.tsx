"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PLATFORM_COMMISSION_BPS } from "@/lib/commission-defaults";

export function CommissionForm() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/commission");
        const j = await r.json();
        if (r.ok) {
          if (j.locked) {
            setMsg(`Commission is locked at ${(DEFAULT_PLATFORM_COMMISSION_BPS / 100).toFixed(1)}% for all transactions.`);
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      {msg ? <p className="text-sm text-stone-600">{msg}</p> : null}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-amber-950">Global marketplace commission (locked)</p>
        <p className="mt-2 text-sm text-stone-700">
          Product sales and bookings both use <strong>{(DEFAULT_PLATFORM_COMMISSION_BPS / 100).toFixed(1)}%</strong>.
          No per-stream or per-studio overrides are allowed.
        </p>
      </div>
    </div>
  );
}
