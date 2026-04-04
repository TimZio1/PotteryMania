"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    const res = await fetch(`/api/studios/${studioId}/kiln/firings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, notes }),
    });
    if (!res.ok) {
      const j = await res.json();
      setMsg(j.error || "Failed");
      return;
    }
    setLabel("");
    setNotes("");
    router.refresh();
    load();
  }

  async function setFiringStatus(id: string, status: string) {
    await fetch(`/api/studios/${studioId}/kiln/firings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function addItem(firingId: string, description: string) {
    if (!description.trim()) return;
    await fetch(`/api/studios/${studioId}/kiln/firings/${firingId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    load();
  }

  async function updateItem(itemId: string, status: string) {
    await fetch(`/api/studios/${studioId}/kiln/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function removeFiring(id: string) {
    if (!confirm("Delete this firing and all items?")) return;
    await fetch(`/api/studios/${studioId}/kiln/firings/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p className="text-sm text-stone-500">Loading kiln…</p>;

  return (
    <div className="space-y-8">
      {msg ? <p className={ui.errorText}>{msg}</p> : null}
      <div className={ui.card}>
        <h2 className="text-lg font-semibold text-amber-950">New firing</h2>
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
          <button type="button" onClick={createFiring} className={ui.buttonPrimary}>
            Create firing
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {firings.map((f) => (
          <div key={f.id} className={ui.card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-amber-950">{f.label || "Untitled firing"}</p>
                <p className="text-xs text-stone-500">Status: {f.status}</p>
                {f.notes ? <p className="mt-2 text-sm text-stone-600">{f.notes}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {(["draft", "loading", "firing", "cooling", "complete"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFiringStatus(f.id, s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      f.status === s ? "bg-amber-950 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => removeFiring(f.id)}
                  className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-4 border-t border-stone-100 pt-4">
              <p className="text-sm font-medium text-stone-800">Pieces</p>
              <ul className="mt-2 space-y-2">
                {f.items.map((it) => (
                  <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
                    <span>{it.description}</span>
                    <span className="flex gap-2">
                      {["queued", "in_kiln", "complete"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateItem(it.id, s)}
                          className={`rounded px-2 py-0.5 text-xs ${
                            it.status === s ? "bg-amber-800 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"
                          }`}
                        >
                          {s.replace(/_/g, " ")}
                        </button>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
              <AddPieceRow onAdd={(d) => addItem(f.id, d)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddPieceRow({ onAdd }: { onAdd: (d: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-3 flex gap-2">
      <input
        className={ui.input}
        placeholder="Piece description"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <button
        type="button"
        className={ui.buttonSecondary}
        onClick={() => {
          onAdd(v);
          setV("");
        }}
      >
        Add piece
      </button>
    </div>
  );
}
