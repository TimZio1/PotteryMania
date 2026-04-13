"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";

export function PackagePurchaseForm({
  packageId,
  defaultStartDate,
}: {
  packageId: string;
  defaultStartDate: string;
}) {
  const router = useRouter();
  const [startsAt, setStartsAt] = useState(defaultStartDate);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function purchase() {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/packages/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, startsAt }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start package checkout");
      }
      window.location.href = data.url;
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not start package checkout");
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
      <label className="block text-sm">
        <span className={ui.label}>Start date</span>
        <input
          type="date"
          className={`${ui.input} mt-1`}
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          min={defaultStartDate}
        />
      </label>
      <button type="button" className={ui.buttonPrimary} onClick={purchase} disabled={busy}>
        {busy ? "Redirecting..." : "Buy package"}
      </button>
      {err ? <p className={ui.errorText}>{err}</p> : null}
    </div>
  );
}
