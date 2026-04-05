"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type Props = {
  studioId: string;
  displayName: string;
  status: string;
  marketplaceRankWeight: number;
};

export function StudioAdminDetailActions({ studioId, displayName, status, marketplaceRankWeight }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [rankInput, setRankInput] = useState(String(marketplaceRankWeight));

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/studios/${studioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Request failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveRank() {
    const n = parseInt(rankInput, 10);
    if (!Number.isFinite(n)) {
      setMsg("Rank weight must be a number");
      return;
    }
    await patch({ marketplaceRankWeight: n });
    setMsg("Saved rank weight");
  }

  return (
    <div className="space-y-6">
      {msg ? <p className={msg.includes("Saved") ? ui.successText : ui.errorText}>{msg}</p> : null}

      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-amber-950">Marketplace rank weight</h3>
        <p className="mt-1 text-xs text-stone-500">
          Higher values sort earlier on /studios (recommended ordering). Range roughly −10 000 … 10 000.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className={ui.label} htmlFor="studio-rank-w">
              Weight
            </label>
            <input
              id="studio-rank-w"
              type="number"
              className={`${ui.input} mt-1 w-32`}
              value={rankInput}
              onChange={(e) => setRankInput(e.target.value)}
            />
          </div>
          <button type="button" disabled={busy} onClick={saveRank} className={ui.buttonSecondary}>
            Save weight
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-amber-950">Status</h3>
        <p className="mt-1 text-xs text-stone-500">Current: {status}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {status === "pending_review" ? (
            <>
              <button
                type="button"
                disabled={busy}
                className={ui.buttonPrimary}
                onClick={() => patch({ status: "approved" })}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                className={ui.buttonSecondary}
                onClick={() =>
                  patch({ status: "rejected", rejectionReason: "Please update your studio profile and resubmit." })
                }
              >
                Reject (template reason)
              </button>
            </>
          ) : null}

          {status === "approved" ? (
            <button type="button" disabled={busy} className={ui.buttonSecondary} onClick={() => patch({ status: "suspended" })}>
              Suspend
            </button>
          ) : null}

          {status === "suspended" ? (
            <button type="button" disabled={busy} className={ui.buttonPrimary} onClick={() => patch({ status: "approved" })}>
              Reactivate (approve)
            </button>
          ) : null}

          {status === "rejected" ? (
            <button
              type="button"
              disabled={busy}
              className={ui.buttonPrimary}
              onClick={() => patch({ status: "pending_review" })}
            >
              Send back to pending review
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Studio: <span className="font-medium text-stone-700">{displayName}</span>
        </p>
      </div>
    </div>
  );
}
