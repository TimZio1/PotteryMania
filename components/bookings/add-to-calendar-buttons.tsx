"use client";

import { useCallback, useEffect, useState } from "react";
import type { VisualMode } from "@/lib/visual-mode";
import { getUi } from "@/lib/ui-styles";

type Payload = {
  googleCalendarUrl: string;
  outlookCalendarUrl: string;
  icsAuthenticatedUrl: string | null;
  /** Signed shareable .ics link (e.g. for email forwards) */
  icsGuestUrl: string | null;
};

const CALENDAR_OK = new Set([
  "pending",
  "awaiting_vendor_approval",
  "confirmed",
  "completed",
  "cancellation_requested",
]);

export function AddToCalendarButtons({
  bookingId,
  bookingStatus,
  visualMode = "studio",
}: {
  bookingId: string;
  bookingStatus: string;
  /** `platform` for account/system surfaces; `studio` for warm public / studio-led UI. */
  visualMode?: VisualMode;
}) {
  const ui = getUi(visualMode);
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    const res = await fetch(`/api/bookings/${bookingId}/calendar-actions`);
    if (!res.ok) {
      setErr("Could not load calendar links.");
      return;
    }
    setData((await res.json()) as Payload);
  }, [bookingId]);

  useEffect(() => {
    if (!CALENDAR_OK.has(bookingStatus)) return;
    void load();
  }, [bookingStatus, load]);

  if (!CALENDAR_OK.has(bookingStatus)) return null;
  if (err) {
    return <p className={`text-xs ${visualMode === "platform" ? "text-rose-700" : "text-rose-700"}`}>{err}</p>;
  }
  if (!data) {
    return (
      <p className={`text-xs ${visualMode === "platform" ? "text-stone-500" : "text-stone-500"}`}>Loading calendar…</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className={`text-xs font-medium uppercase tracking-wide ${visualMode === "platform" ? "text-stone-500" : "text-stone-500"}`}>
        Add to your calendar
      </p>
      <div className="flex flex-wrap gap-2">
        <a href={data.googleCalendarUrl} target="_blank" rel="noopener noreferrer" className={ui.buttonSecondary}>
          Google
        </a>
        <a href={data.outlookCalendarUrl} target="_blank" rel="noopener noreferrer" className={ui.buttonSecondary}>
          Outlook
        </a>
        {data.icsAuthenticatedUrl ? (
          <a href={data.icsAuthenticatedUrl} className={ui.buttonSecondary}>
            Apple / .ics
          </a>
        ) : null}
        {data.icsGuestUrl ? (
          <a href={data.icsGuestUrl} className={ui.buttonSecondary} target="_blank" rel="noopener noreferrer">
            Share .ics link
          </a>
        ) : null}
      </div>
    </div>
  );
}
