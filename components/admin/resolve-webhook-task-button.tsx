"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";

export default function ResolveWebhookTaskButton({ taskId }: { taskId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function resolve() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/webhook-events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (r.ok) {
        window.location.reload();
        return;
      }
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not mark task as resolved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void resolve()}
        className="rounded-lg border border-stone-300 px-3 py-1 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
      >
        {busy ? (
          <span className="inline-flex items-center gap-1">
            <Spinner size="sm" />
            Resolving…
          </span>
        ) : (
          "Mark resolved"
        )}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
