"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ui } from "@/lib/ui-styles";

type Row = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  variantBPercent: number;
  updatedAt: string;
};

export default function ExperimentsAdminClient() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [pct, setPct] = useState("50");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/experiments");
    const j = await r.json();
    setRows(j.experiments ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name,
          variantBPercent: Number(pct),
          reason,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error ?? "Failed");
        return;
      }
      setSlug("");
      setName("");
      setReason("");
      await load();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row: Row) {
    const rsn = window.prompt("Audit reason (min 3 chars)?", row.isActive ? "Disable experiment" : "Enable experiment");
    if (!rsn || rsn.trim().length < 3) return;
    setError(null);
    const res = await fetch(`/api/admin/experiments/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !row.isActive, reason: rsn.trim() }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Could not update experiment.");
      return;
    }
    await load();
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className={`${ui.card} space-y-3`}>
        <h2 className="text-lg font-semibold text-amber-950">New experiment</h2>
        {error ? <p className={ui.errorText}>{error}</p> : null}
        <p className="text-sm text-stone-600">
          Slug is referenced in code when reading assignment. Variant B share is 0–100; A gets the rest.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded-lg border border-stone-200 px-2 py-2" placeholder="slug-kebab" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <input className="rounded-lg border border-stone-200 px-2 py-2" placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded-lg border border-stone-200 px-2 py-2" placeholder="B %" value={pct} onChange={(e) => setPct(e.target.value)} />
          <input className="rounded-lg border border-stone-200 px-2 py-2 sm:col-span-2" placeholder="Audit reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <button type="button" disabled={busy} className={ui.buttonSecondary} onClick={() => void create()}>
          Create
        </button>
      </div>

      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {rows.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <span className="font-medium text-stone-900">{e.name}</span>{" "}
              <code className="text-xs text-stone-500">{e.slug}</code> · B={e.variantBPercent}% ·{" "}
              {e.isActive ? "active" : "off"}
            </div>
            <button type="button" className={ui.buttonGhost} onClick={() => void toggle(e)}>
              {e.isActive ? "Disable" : "Enable"}
            </button>
          </li>
        ))}
        {rows.length === 0 ? <li className="px-4 py-6 text-stone-500">No experiments.</li> : null}
      </ul>
    </div>
  );
}
