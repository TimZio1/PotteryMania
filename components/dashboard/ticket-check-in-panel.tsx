"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";
import { Spinner } from "@/components/ui/spinner";

type CheckInResponse = {
  ok?: boolean;
  error?: string;
  alreadyCompleted?: boolean;
  bookingId?: string;
  ticketRef?: string | null;
  customerName?: string;
  experienceTitle?: string;
};

export default function TicketCheckInPanel({ studioId }: { studioId: string }) {
  const router = useRouter();
  const [ticketRef, setTicketRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketRef.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/bookings/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketRef }),
      });
      const data = (await res.json()) as CheckInResponse;
      setResult(res.ok ? data : { error: data.error ?? "Check-in failed" });
      if (res.ok) {
        setTicketRef("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn(ui.card, "space-y-3")}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Fast check-in</p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Scan or enter ticket reference</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Works with manual entry or QR scanner devices that type into the input field.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          className={cn(ui.input, "sm:flex-1")}
          value={ticketRef}
          onChange={(e) => setTicketRef(e.target.value)}
          placeholder="PM-AB12CD34 or scanned QR value"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" disabled={busy || !ticketRef.trim()} className={ui.buttonPrimary}>
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" className="text-white" />
              Checking in…
            </span>
          ) : (
            "Check in"
          )}
        </button>
      </form>

      {result?.error ? <p className="text-sm text-rose-700">{result.error}</p> : null}
      {result?.ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-medium">
            {result.alreadyCompleted ? "Already checked in." : "Check-in complete."}
          </p>
          {(result.customerName || result.experienceTitle || result.ticketRef) && (
            <p className="mt-1">
              {[result.customerName, result.experienceTitle, result.ticketRef].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
