"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export default function AdminInsightForceUnlockButton({ insightId }: { insightId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    let note = "";
    for (;;) {
      const r = window.prompt(
        "Audit reason (required, at least 8 characters) — who asked and why unlock:",
        note,
      );
      if (r === null) return;
      note = r.trim();
      if (note.length >= 8) break;
      window.alert("Please enter at least 8 characters for the audit log.");
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/generated-insights/${insightId}/force-unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: note }),
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
