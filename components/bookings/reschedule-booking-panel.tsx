"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { isReschedulable } from "@/lib/bookings/status";
import { platformUi } from "@/lib/ui-styles";
import { Spinner } from "@/components/ui/spinner";

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
        setError(j.error || "We couldn't load available sessions. Try again.");
        setData(null);
        return;
      }
      setData(j);
      setSelectedId("");
    } catch {
      setError("Network problem. Check your connection and try again.");
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
        setError(typeof j.error === "string" ? j.error : "We couldn't reschedule. Try again.");
        return;
      }
      setMsg("Moved. A confirmation email is on the way.");
      setOpen(false);
      setData(null);
      if (onSuccess) onSuccess();
      else router.refresh();
    } catch {
      setError("Network problem. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`border-t border-stone-200/80 pt-4 ${className}`}>
      {!open ? (
        <button type="button" onClick={handleOpen} className={platformUi.buttonSecondary}>
          Move to another date
        </button>
      ) : (
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-(--pm-shadow-rest)">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-stone-900">Pick a new date</p>
            <button
              type="button"
              className="text-xs font-medium text-stone-500 hover:text-amber-950"
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
              Needs {participantCount} open {participantCount === 1 ? "seat" : "seats"}
              {seatType ? ` (${seatType})` : ""} on the new date.
            </p>
          ) : null}

          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-stone-500" role="status" aria-busy="true">
              <Spinner size="sm" />
              <span className="sr-only">Loading dates</span>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          {msg ? <p className="mt-3 text-sm text-emerald-800">{msg}</p> : null}

          {data && !data.reschedulable ? (
            <p className="mt-3 text-sm text-stone-600">{data.reason ?? "This booking can't be moved."}</p>
          ) : null}

          {data?.reschedulable && !loading ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {data.slots.length === 0 ? (
                <p className="text-sm text-stone-600">
                  No open dates with enough seats in the next 90 days. Ask the studio to add dates.
                </p>
              ) : (
                <label className="block">
                  <span className={platformUi.label}>New date</span>
                  <select
                    className={`${platformUi.input} mt-1`}
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    required
                  >
                    <option value="">Choose a date…</option>
                    {data.slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.slotDate} · {s.startTime}–{s.endTime} ({s.spotsLeft} open)
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className={platformUi.label}>Reason (optional)</span>
                <input
                  className={`${platformUi.input} mt-1`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why you're moving this"
                />
              </label>
              {data.slots.length > 0 ? (
                <button type="submit" disabled={submitting || !selectedId} className={platformUi.buttonPrimary}>
                  {submitting ? "Saving…" : "Confirm new date"}
                </button>
              ) : null}
            </form>
          ) : null}
        </div>
      )}
    </div>
  );
}
