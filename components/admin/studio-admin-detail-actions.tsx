"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
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
  const [auditReason, setAuditReason] = useState("");

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    const reason = auditReason.trim();
    if (reason.length < 8) {
      setMsg("Enter an audit reason (min 8 characters) in the field below.");
      return false;
    }
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/studios/${studioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, reason }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Request failed");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setMsg("Network error");
      return false;
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
    const ok = await patch({ marketplaceRankWeight: n });
    if (ok) setMsg("Saved rank weight");
  }

  return (
    <div className="space-y-6">
      {msg ? <p className={msg.includes("Saved") ? ui.successText : ui.errorText}>{msg}</p> : null}

      <label className="block max-w-xl">
        <span className={ui.label}>Audit reason (required for status / rank changes)</span>
        <textarea
          className={cn(ui.input, "mt-1 min-h-[72px] resize-y")}
          value={auditReason}
          onChange={(e) => setAuditReason(e.target.value)}
          placeholder="Why you are changing this studio…"
          maxLength={500}
        />
      </label>

      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-amber-950">Discovery rank weight</h3>
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
