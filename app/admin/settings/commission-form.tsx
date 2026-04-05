"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PLATFORM_COMMISSION_BPS } from "@/lib/commission-defaults";
import { ui } from "@/lib/ui-styles";

export function CommissionForm() {
  const [productBps, setProductBps] = useState(DEFAULT_PLATFORM_COMMISSION_BPS);
  const [bookingBps, setBookingBps] = useState(DEFAULT_PLATFORM_COMMISSION_BPS);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/commission");
        const j = await r.json();
        if (r.ok) {
          const fb =
            j.fallback?.configValue &&
            typeof j.fallback.configValue === "object" &&
            j.fallback.configValue !== null &&
            "bps" in j.fallback.configValue &&
            typeof (j.fallback.configValue as { bps: unknown }).bps === "number"
              ? (j.fallback.configValue as { bps: number }).bps
              : DEFAULT_PLATFORM_COMMISSION_BPS;
          if (j.productRule?.percentageBasisPoints != null) setProductBps(j.productRule.percentageBasisPoints);
          else setProductBps(fb);
          if (j.bookingRule?.percentageBasisPoints != null) setBookingBps(j.bookingRule.percentageBasisPoints);
          else setBookingBps(fb);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function save(itemType: "product" | "booking", bps: number) {
    setPending(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/commission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, percentageBasisPoints: bps }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Failed");
        return;
      }
      setMsg("Saved. Check /admin/audit for the log entry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {msg ? <p className="text-sm text-stone-600">{msg}</p> : null}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-amber-950">Product commission (global)</p>
        <p className="mt-1 text-xs text-stone-500">Basis points (100 = 1.00%)</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <input
            type="number"
            className={ui.input}
            min={0}
            max={10000}
            value={productBps}
            onChange={(e) => setProductBps(parseInt(e.target.value, 10) || 0)}
          />
          <button type="button" className={ui.buttonPrimary} disabled={pending} onClick={() => save("product", productBps)}>
            Save product
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-amber-950">Booking commission (global)</p>
        <p className="mt-1 text-xs text-stone-500">Basis points (100 = 1.00%)</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <input
            type="number"
            className={ui.input}
            min={0}
            max={10000}
            value={bookingBps}
            onChange={(e) => setBookingBps(parseInt(e.target.value, 10) || 0)}
          />
          <button type="button" className={ui.buttonPrimary} disabled={pending} onClick={() => save("booking", bookingBps)}>
            Save booking
          </button>
        </div>
      </div>
    </div>
  );
}
