"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { SkeletonText } from "@/components/ui/skeleton";
import { ui } from "@/lib/ui-styles";

type KilnItem = { id: string; description: string; status: string };
type KilnFiring = {
  id: string;
  label: string | null;
  notes: string | null;
  status: string;
  scheduledAt: string | null;
  items: KilnItem[];
};

export default function KilnManager({ studioId }: { studioId: string }) {
  const router = useRouter();
  const [firings, setFirings] = useState<KilnFiring[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studioId}/kiln/firings`);
    const data = await res.json();
    if (res.ok) {
      setFirings(
        data.firings.map((f: KilnFiring & { scheduledAt: Date | null }) => ({
          ...f,
          scheduledAt: f.scheduledAt ? new Date(f.scheduledAt).toISOString() : null,
        })),
      );
    }
    setLoading(false);
  }, [studioId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createFiring() {
    setMsg("");
    setBusyId("create");
    const res = await fetch(`/api/studios/${studioId}/kiln/firings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, notes }),
    });
    if (!res.ok) {
      const j = await res.json();
      setMsg(j.error || "Failed");
      setBusyId(null);
      return;
    }
    setLabel("");
    setNotes("");
    router.refresh();
    load();
    setBusyId(null);
  }

  async function setFiringStatus(id: string, status: string) {
    setBusyId(`firing:${id}`);
    const res = await fetch(`/api/studios/${studioId}/kiln/firings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || "Could not update firing.");
      setBusyId(null);
      return;
    }
    load();
    setBusyId(null);
  }

  async function addItem(firingId: string, description: string) {
    if (!description.trim()) return;
    setBusyId(`item-add:${firingId}`);
    const res = await fetch(`/api/studios/${studioId}/kiln/firings/${firingId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || "Could not add item.");
      setBusyId(null);
      return;
    }
    load();
    setBusyId(null);
  }

  async function updateItem(itemId: string, status: string) {
    setBusyId(`item:${itemId}`);
    const res = await fetch(`/api/studios/${studioId}/kiln/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || "Could not update piece.");
      setBusyId(null);
      return;
    }
    load();
    setBusyId(null);
  }

  async function removeFiring(id: string) {
    if (!confirm("Delete this firing and all items?")) return;
    setBusyId(`delete:${id}`);
    const res = await fetch(`/api/studios/${studioId}/kiln/firings/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || "Could not delete firing.");
      setBusyId(null);
      return;
    }
    load();
    setBusyId(null);
  }

  if (loading) return <SkeletonText className="max-w-xl" lines={4} />;

  return (
    <div className="space-y-8">
      {msg ? <p className={ui.errorText}>{msg}</p> : null}
      <div className={ui.card}>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">New firing</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className={ui.label} htmlFor="kiln-label">
              Label
            </label>
            <input
              id="kiln-label"
              className={`${ui.input} mt-1`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Cone 6 — March load"
            />
          </div>
          <div>
            <label className={ui.label} htmlFor="kiln-notes">
              Notes
            </label>
            <textarea
              id="kiln-notes"
              className={`${ui.input} mt-1 min-h-[80px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button type="button" onClick={createFiring} disabled={busyId !== null} className={ui.buttonPrimary}>
            {busyId === "create" ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" className="text-white" />
                Creating…
              </span>
            ) : (
              "Create firing"
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {firings.length === 0 ? (
          <div className={`${ui.card} text-center`}>
            <p className="font-medium text-[var(--foreground)]">No firings logged yet</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Create your first firing above to track kiln loads and pieces from queue through complete.
            </p>
          </div>
        ) : null}
        {firings.map((f) => (
          <div key={f.id} className={ui.card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--foreground)]">{f.label || "Untitled firing"}</p>
                <p className="text-xs text-[var(--muted)]">Status: {f.status}</p>
                {f.notes ? <p className="mt-2 text-sm text-[var(--muted)]">{f.notes}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {(["draft", "loading", "firing", "cooling", "complete"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => setFiringStatus(f.id, s)}
                    className={`${ui.chip} ${f.status === s ? ui.chipOn : ui.chipOff}`}
                  >
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => removeFiring(f.id)}
                  className={ui.chipDanger}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-4 border-t border-stone-100 pt-4">
              <p className="text-sm font-medium text-[var(--foreground)]">Pieces</p>
              <ul className="mt-2 space-y-2">
                {f.items.map((it) => (
                  <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
                    <span>{it.description}</span>
                    <span className="flex gap-2">
                      {["queued", "in_kiln", "complete"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => updateItem(it.id, s)}
                          className={`${ui.chipSm} ${it.status === s ? ui.chipSmOn : ui.chipSmOff}`}
                        >
                          {s.replace(/_/g, " ")}
                        </button>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
              <AddPieceRow onAdd={(d) => addItem(f.id, d)} disabled={busyId !== null} busy={busyId === `item-add:${f.id}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddPieceRow({ onAdd, disabled, busy }: { onAdd: (d: string) => void; disabled: boolean; busy: boolean }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-3 flex gap-2">
      <input
        className={ui.input}
        placeholder="Piece description"
        value={v}
        onChange={(e) => setV(e.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        className={ui.buttonSecondary}
        disabled={disabled}
        onClick={() => {
          onAdd(v);
          setV("");
        }}
      >
        {busy ? "Adding…" : "Add piece"}
      </button>
    </div>
  );
}
