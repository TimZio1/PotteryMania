"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export function NotificationsMarkRead({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function mark() {
    setBusy(true);
    try {
      await fetch(`/api/admin/notifications/${id}`, { method: "PATCH" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" disabled={busy} className={ui.buttonSecondary} onClick={() => void mark()}>
      {busy ? "…" : "Mark read"}
    </button>
  );
}
