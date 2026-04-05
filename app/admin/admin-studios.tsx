"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type S = {
  id: string;
  displayName: string;
  email: string;
  owner: { email: string };
};

export function AdminStudios({ initialStudios }: { initialStudios: S[] }) {
  const router = useRouter();
  const [studios, setStudios] = useState(initialStudios);
  const [msg, setMsg] = useState("");

  async function act(id: string, status: "approved" | "rejected", reason?: string) {
    setMsg("");
    const r = await fetch(`/api/admin/studios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectionReason: reason }),
    });
    if (!r.ok) {
      const j = await r.json();
      setMsg(j.error || "Failed");
      return;
    }
    setStudios((prev) => prev.filter((s) => s.id !== id));
    router.refresh();
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Pending studios</h2>
        <Link
          href="/admin/studios"
          className="text-sm font-medium text-amber-900 underline decoration-amber-700/40 underline-offset-2 hover:decoration-amber-900"
        >
          Browse all studios
        </Link>
      </div>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <ul className="mt-4 space-y-4">
        {studios.map((s) => (
          <li key={s.id} className="rounded border border-stone-200 bg-white p-4">
            <p className="font-medium">{s.displayName}</p>
            <p className="text-sm text-stone-500">{s.email}</p>
            <p className="text-xs text-stone-400">Owner: {s.owner.email}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="min-h-11 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-800" onClick={() => act(s.id, "approved")}>
                Approve
              </button>
              <button
                type="button"
                className="min-h-11 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-800"
                onClick={() => act(s.id, "rejected", "Please update your profile")}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
      {studios.length === 0 && <p className="mt-4 text-stone-500">No pending studios.</p>}
    </div>
  );
}