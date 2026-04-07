"use client";

import { useState } from "react";

export default function ResolveWebhookTaskButton({ taskId }: { taskId: string }) {
  const [busy, setBusy] = useState(false);
  async function resolve() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/webhook-events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (r.ok) window.location.reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void resolve()}
      className="rounded-lg border border-stone-300 px-3 py-1 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
    >
      {busy ? "…" : "Mark resolved"}
    </button>
  );
}
