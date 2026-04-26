"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmActionModal } from "@/components/admin/confirm-action-modal";

type Props = {
  studioId: string;
  displayName: string;
  actorIsHyperAdmin: boolean;
};

export function StudioAdminDangerZone({ studioId, displayName, actorIsHyperAdmin }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState("");

  async function performDelete(reason: string) {
    setPending(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/studios/${studioId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Deletion failed.");
        return;
      }
      setOpen(false);
      router.push("/admin/studios");
      router.refresh();
    } catch {
      setMsg("Network error.");
    } finally {
      setPending(false);
    }
  }

  if (!actorIsHyperAdmin) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-stone-900">Delete studio</p>
        <p className="mt-1 text-xs text-stone-500">
          Only a hyper_admin can delete a studio. Ask an owner to perform this action.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-300 bg-red-50/60 p-5 shadow-sm">
      <p className="text-sm font-semibold text-red-900">Danger zone — delete studio</p>
      <p className="mt-1 text-xs text-stone-600">
        If the studio has no orders, bookings, or products, it is hard-deleted. Otherwise
        it is anonymized, suspended, hidden from public discovery, and rank-deprioritized
        — its commerce history stays intact for accounting. The action is audit-logged
        and cannot be undone.
      </p>
      {msg ? <p className="mt-3 text-sm text-red-700">{msg}</p> : null}
      <button
        type="button"
        className="mt-3 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:opacity-50"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        Delete studio
      </button>

      <ConfirmActionModal
        open={open}
        title="Delete studio"
        description={`Permanently anonymize ${displayName}. The studio will be suspended, removed from public discovery, and its profile fields wiped. Commerce records (orders, bookings, products) are preserved in anonymized form. This cannot be undone.`}
        confirmLabel="Delete permanently"
        confirmationText={displayName}
        onCancel={() => setOpen(false)}
        onConfirm={performDelete}
        pending={pending}
      />
    </div>
  );
}
