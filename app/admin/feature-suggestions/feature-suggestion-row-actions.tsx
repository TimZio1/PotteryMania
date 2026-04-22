"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";
import {
  FEATURE_SUGGESTION_STATUSES,
  FEATURE_SUGGESTION_STATUS_LABEL,
  type FeatureSuggestionStatus,
} from "@/lib/feature-suggestions";

const STATUS_LABEL = FEATURE_SUGGESTION_STATUS_LABEL;

export function FeatureSuggestionRowActions({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: FeatureSuggestionStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(currentStatus);

  async function updateStatus(next: FeatureSuggestionStatus) {
    if (next === status) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/feature-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "We couldn’t update that. Try again.");
        return;
      }
      setStatus(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this suggestion? This can’t be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/feature-suggestions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "We couldn’t delete that. Try again.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-stone-600">
          Status
          <select
            className="ml-2 rounded-md border border-stone-200 bg-white px-2 py-1 text-sm text-stone-800"
            value={status}
            disabled={busy}
            onChange={(e) => void updateStatus(e.target.value as FeatureSuggestionStatus)}
          >
            {FEATURE_SUGGESTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className={`${ui.buttonGhost} !text-rose-700 hover:!text-rose-800`}
        >
          Delete
        </button>
      </div>
      {error ? <p className="text-xs font-medium text-rose-700">{error}</p> : null}
    </div>
  );
}
