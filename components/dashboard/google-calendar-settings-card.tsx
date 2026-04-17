"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { platformUi } from "@/lib/ui-styles";

type Props = {
  studioId: string;
  oauthConfigured: boolean;
  connectionStatus: "none" | "connected" | "error" | "disconnected" | "pending";
  lastSyncAt: string | null;
  syncErrorState: string | null;
  syncEnabled: boolean;
  hasGoogleConnection: boolean;
};

export default function GoogleCalendarSettingsCard({
  studioId,
  oauthConfigured,
  connectionStatus,
  lastSyncAt,
  syncErrorState,
  syncEnabled,
  hasGoogleConnection,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [syncOn, setSyncOn] = useState(syncEnabled);
  const connected = connectionStatus === "connected";

  useEffect(() => {
    setSyncOn(syncEnabled);
  }, [syncEnabled]);

  async function disconnect() {
    if (
      !window.confirm(
        "Disconnect Google Calendar? We stop syncing new changes; events already created in Google stay there unless you remove them manually.",
      )
    )
      return;
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

  async function setSyncEnabled(next: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/calendar/google/sync-enabled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studioId, syncEnabled: next }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        alert(j.error ?? "Update failed");
        return;
      }
      setSyncOn(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${platformUi.card} space-y-3`}>
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Google Calendar</h2>
      <p className="text-sm text-[var(--muted)]">
        Confirmed class bookings can appear on your Google Calendar. Connect once; confirmations and reschedules update the same
        event automatically.
      </p>
      {!oauthConfigured ? (
        <p className="text-sm text-amber-800">
          Calendar connect is not enabled on this deployment (missing{" "}
          <code className="rounded bg-stone-100 px-1 text-stone-800">GOOGLE_CALENDAR_CLIENT_ID</code> / secret).
        </p>
      ) : connected ? (
        <div className="space-y-3 text-sm text-[var(--foreground)]">
          <p className="font-medium text-emerald-700">Connected</p>
          {lastSyncAt ? <p className="text-[var(--muted)]">Last sync: {new Date(lastSyncAt).toLocaleString()}</p> : null}
          {syncErrorState ? <p className="text-rose-700">Last error: {syncErrorState}</p> : null}
          {hasGoogleConnection && connected ? (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={syncOn}
                disabled={busy}
                onChange={(e) => void setSyncEnabled(e.target.checked)}
              />
              <span>Sync new bookings and updates to Google</span>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" disabled={busy} onClick={() => void disconnect()} className={platformUi.buttonSecondary}>
              {busy ? "Working…" : "Disconnect"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-[var(--foreground)]">
          {connectionStatus === "error" ? (
            <p className="text-rose-700">Connection error{syncErrorState ? `: ${syncErrorState}` : ""}. Reconnect to restore sync.</p>
          ) : (
            <p>Not connected.</p>
          )}
          <a href={`/api/calendar/google/connect?studioId=${encodeURIComponent(studioId)}`} className={platformUi.buttonSecondary}>
            Connect Google Calendar
          </a>
        </div>
      )}
    </div>
  );
}
