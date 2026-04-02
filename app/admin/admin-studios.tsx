"use client";

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
      <h2 className="text-lg font-medium">Pending studios</h2>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <ul className="mt-4 space-y-4">
        {studios.map((s) => (
          <li key={s.id} className="rounded border border-stone-200 bg-white p-4">
            <p className="font-medium">{s.displayName}</p>
            <p className="text-sm text-stone-500">{s.email}</p>
            <p className="text-xs text-stone-400">Owner: {s.owner.email}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="rounded bg-green-700 px-3 py-1 text-sm text-white" onClick={() => act(s.id, "approved")}>
                Approve
              </button>
              <button
                type="button"
                className="rounded bg-red-700 px-3 py-1 text-sm text-white"
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