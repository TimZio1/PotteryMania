"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export default function AdminInsightForceUnlockButton({ insightId }: { insightId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    const r = window.prompt("Optional note for audit log (or leave blank):");
    if (r === null) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/generated-insights/${insightId}/force-unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r.trim() || undefined }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(j.error ?? "Failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" disabled={busy} className={ui.buttonGhost} onClick={() => void run()}>
      {busy ? "…" : "Unlock"}
    </button>
  );
}
