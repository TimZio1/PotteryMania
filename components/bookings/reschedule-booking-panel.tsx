"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { isReschedulable } from "@/lib/bookings/status";
import { ui } from "@/lib/ui-styles";

type SlotOption = {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  spotsLeft: number;
};

type OptionsJson =
  | {
      reschedulable: true;
      currentSlotId: string;
      experienceId: string;
      slots: SlotOption[];
    }
  | {
      reschedulable: false;
      reason?: string;
      currentSlotId: string;
      slots: SlotOption[];
    };

export function RescheduleBookingPanel({
  bookingId,
  bookingStatus,
  participantCount,
  seatType,
  onSuccess,
  className = "",
}: {
  bookingId: string;
  bookingStatus: string;
  participantCount: number;
  seatType?: string | null;
  onSuccess?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [data, setData] = useState<OptionsJson | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule-options`);
      const j = (await res.json()) as OptionsJson & { error?: string };
      if (!res.ok) {
        setError(j.error || "Could not load sessions");
        setData(null);
        return;
      }
      setData(j);
      setSelectedId("");
    } catch {
      setError("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  function handleOpen() {
    setOpen(true);
    setData(null);
    setSelectedId("");
    setReason("");
    setError("");
    setMsg("");
    void loadOptions();
  }

  if (!isReschedulable(bookingStatus as BookingStatus)) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setSubmitting(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newSlotId: selectedId,
          reason: reason.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Reschedule failed");
        return;
      }
      setMsg("Session updated. Confirmation email is on the way.");
      setOpen(false);
      setData(null);
      if (onSuccess) onSuccess();
      else router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`border-t border-stone-100 pt-4 ${className}`}>
      {!open ? (
        <button type="button" onClick={handleOpen} className={ui.buttonSecondary}>
          Reschedule to another session
        </button>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-stone-800">Pick a new open session</p>
            <button
              type="button"
              className="text-xs font-medium text-stone-500 hover:text-amber-900"
              onClick={() => {
                setOpen(false);
                setData(null);
                setSelectedId("");
                setReason("");
                setError("");
                setMsg("");
              }}
            >
              Close
            </button>
          </div>
          {participantCount > 1 ? (
            <p className="mt-2 text-xs text-stone-500">
              {participantCount} spots must be available on the new session
              {seatType ? ` (${seatType})` : ""}.
            </p>
          ) : null}

          {loading ? <p className="mt-3 text-sm text-stone-500">Loading sessions…</p> : null}

          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          {msg ? <p className="mt-3 text-sm text-emerald-800">{msg}</p> : null}

          {data && !data.reschedulable ? (
            <p className="mt-3 text-sm text-stone-600">{data.reason ?? "This booking cannot be rescheduled."}</p>
          ) : null}

          {data?.reschedulable && !loading ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {data.slots.length === 0 ? (
                <p className="text-sm text-stone-600">
                  No open sessions with enough capacity in the next 90 days. Ask the studio to add dates or free capacity.
                </p>
              ) : (
                <label className="block">
                  <span className={ui.label}>Available sessions</span>
                  <select
                    className={`${ui.input} mt-1`}
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    required
                  >
                    <option value="">Select a session…</option>
                    {data.slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.slotDate} · {s.startTime}–{s.endTime} ({s.spotsLeft} left)
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className={ui.label}>Note (optional)</span>
                <input
                  className={`${ui.input} mt-1`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for change"
                />
              </label>
              {data.slots.length > 0 ? (
                <button type="submit" disabled={submitting || !selectedId} className={ui.buttonPrimary}>
                  {submitting ? "Saving…" : "Confirm new session"}
                </button>
              ) : null}
            </form>
          ) : null}
        </div>
      )}
    </div>
  );
}
