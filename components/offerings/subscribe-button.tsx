"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export default function SubscribeButton({
  offeringType,
  offeringId,
  cta = "Subscribe",
}: {
  offeringType: "product" | "experience";
  offeringId: string;
  cta?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function start() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/offerings/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offeringType, offeringId }),
    });
    const json = (await res.json()) as { checkoutUrl?: string; error?: string };
    setBusy(false);
    if (!res.ok || !json.checkoutUrl) {
      setMsg(json.error ?? "Could not start subscription checkout.");
      return;
    }
    window.location.href = json.checkoutUrl;
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={start} disabled={busy} className={ui.buttonPrimary}>
        {busy ? "Redirecting…" : cta}
      </button>
      {msg ? <p className={ui.errorText}>{msg}</p> : null}
    </div>
  );
}
