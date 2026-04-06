"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type Props = {
  studioId: string;
  oauthConfigured: boolean;
  connectionStatus: "none" | "connected" | "error" | "disconnected" | "pending";
  lastSyncAt: string | null;
  syncErrorState: string | null;
};

export default function GoogleCalendarSettingsCard({
  studioId,
  oauthConfigured,
  connectionStatus,
  lastSyncAt,
  syncErrorState,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const connected = connectionStatus === "connected";

  async function disconnect() {
    if (!window.confirm("Disconnect Google Calendar? Future bookings will not sync until you connect again.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/calendar/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studioId }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        alert(j.error ?? "Disconnect failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${ui.card} space-y-3`}>
      <h2 className="text-lg font-semibold text-stone-900">Google Calendar</h2>
      <p className="text-sm text-stone-600">
        Confirmed class bookings can appear on your Google Calendar. Connect once; new confirmations and reschedules sync automatically.
      </p>
      {!oauthConfigured ? (
        <p className="text-sm text-amber-900">
          Calendar connect is not enabled on this deployment (missing <code className="rounded bg-stone-100 px-1">GOOGLE_CALENDAR_CLIENT_ID</code> / secret).
        </p>
      ) : connected ? (
        <div className="space-y-2 text-sm text-stone-700">
          <p className="font-medium text-emerald-800">Connected</p>
          {lastSyncAt ? <p className="text-stone-600">Last sync: {new Date(lastSyncAt).toLocaleString()}</p> : null}
          {syncErrorState ? <p className="text-rose-700">Last error: {syncErrorState}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" disabled={busy} onClick={() => void disconnect()} className={ui.buttonSecondary}>
              {busy ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-stone-700">
          {connectionStatus === "error" ? (
            <p className="text-rose-700">Connection error{syncErrorState ? `: ${syncErrorState}` : ""}. Reconnect to restore sync.</p>
          ) : (
            <p>Not connected.</p>
          )}
          <a href={`/api/calendar/google/connect?studioId=${encodeURIComponent(studioId)}`} className={ui.buttonSecondary}>
            Connect Google Calendar
          </a>
        </div>
      )}
    </div>
  );
}
