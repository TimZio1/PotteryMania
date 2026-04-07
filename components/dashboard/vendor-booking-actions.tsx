"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { isReschedulable } from "@/lib/bookings/status";
import { RescheduleBookingPanel } from "@/components/bookings/reschedule-booking-panel";
import { Spinner } from "@/components/ui/spinner";

export default function VendorBookingActions({
  studioId,
  bookingId,
  bookingStatus,
  participantCount,
  seatType,
  calendarSync,
}: {
  studioId: string;
  bookingId: string;
  bookingStatus: string;
  participantCount: number;
  seatType?: string | null;
  calendarSync?: { status: string; message: string | null; at: string } | null;
}) {
  const [msg, setMsg] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const router = useRouter();
  const isCancellable =
    bookingStatus === "pending" || bookingStatus === "confirmed" || bookingStatus === "awaiting_vendor_approval";
  const needsApproval = bookingStatus === "awaiting_vendor_approval";
  const canMarkCompleted = bookingStatus === "confirmed";

  async function handleCancel() {
    if (!confirm("Cancel this booking? The customer will be notified.")) return;
    setMsg("");
    setBusyAction("cancel");
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Vendor cancelled" }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`Cancelled. Refund: ${data.refundOutcome}`);
      router.refresh();
    } else {
      setMsg(`Error: ${data.error}`);
    }
    setBusyAction(null);
  }

  async function handleApprove() {
    setMsg("");
    setBusyAction("approve");
    const res = await fetch(`/api/bookings/${bookingId}/vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Approved.");
      router.refresh();
    } else {
      setMsg(`Error: ${data.error}`);
    }
    setBusyAction(null);
  }

  async function handleReject() {
    const reason = prompt("Optional note to the customer (decline reason):") ?? "";
    if (reason === null) return;
    setMsg("");
    setBusyAction("reject");
    const res = await fetch(`/api/bookings/${bookingId}/vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reason }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Declined. Customer notified.");
      router.refresh();
    } else {
      setMsg(`Error: ${data.error}`);
    }
    setBusyAction(null);
  }

  async function handleCalendarResync() {
    setMsg("");
    setBusyAction("calendar");
    const res = await fetch(`/api/studios/${studioId}/bookings/${bookingId}/calendar-resync`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setMsg("Calendar sync OK.");
      router.refresh();
    } else {
      setMsg(`Calendar sync: ${data.message ?? data.error ?? res.statusText}`);
    }
    setBusyAction(null);
  }

  async function handleMarkCompleted() {
    if (!confirm("Mark this booking as completed (attended)?")) return;
    setMsg("");
    setBusyAction("complete");
    const res = await fetch(`/api/bookings/${bookingId}/vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_completed" }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Marked completed.");
      router.refresh();
    } else {
      setMsg(`Error: ${data.error}`);
    }
    setBusyAction(null);
  }

  const showBlock = needsApproval || isCancellable || canMarkCompleted;
  const showReschedule = isReschedulable(bookingStatus as BookingStatus);
  const showCalVendor =
    (bookingStatus === "confirmed" || bookingStatus === "completed") && Boolean(studioId);

  return (
    <div className="space-y-2">
      <a
        href={`/api/bookings/${bookingId}/calendar`}
        className="inline-block text-xs font-medium text-amber-900 underline underline-offset-2"
      >
        Calendar (.ics)
      </a>
      {showCalVendor ? (
        <div className="text-xs text-stone-600">
          {calendarSync ? (
            <>
              <span>
                Google Calendar sync: {calendarSync.status === "success" ? "OK" : "Failed or pending"}
                {calendarSync.message ? ` — ${calendarSync.message}` : null}
              </span>
              {calendarSync.status !== "success" ? (
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={handleCalendarResync}
                  className="ml-2 font-medium text-amber-900 underline underline-offset-2"
                >
                  {busyAction === "calendar" ? (
                    <span className="inline-flex items-center gap-1">
                      <Spinner size="sm" />
                      Retrying…
                    </span>
                  ) : (
                    "Retry"
                  )}
                </button>
              ) : null}
            </>
          ) : (
            <>
              <span>No Google Calendar sync logged yet for this booking.</span>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={handleCalendarResync}
                className="ml-2 font-medium text-amber-900 underline underline-offset-2"
              >
                {busyAction === "calendar" ? (
                  <span className="inline-flex items-center gap-1">
                    <Spinner size="sm" />
                    Syncing…
                  </span>
                ) : (
                  "Sync now"
                )}
              </button>
            </>
          )}
        </div>
      ) : null}
      {showBlock || showReschedule ? (
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
          {showBlock && needsApproval && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={handleApprove}
                className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800"
              >
                {busyAction === "approve" ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" className="text-white" />
                    Approving…
                  </span>
                ) : (
                  "Approve"
                )}
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={handleReject}
                className="min-h-11 rounded-lg bg-stone-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
              >
                {busyAction === "reject" ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" className="text-white" />
                    Declining…
                  </span>
                ) : (
                  "Decline"
                )}
              </button>
            </div>
          )}
          {showBlock && canMarkCompleted && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={handleMarkCompleted}
              className="min-h-11 rounded-lg bg-amber-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-900"
            >
              {busyAction === "complete" ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" className="text-white" />
                  Saving…
                </span>
              ) : (
                "Mark as attended / completed"
              )}
            </button>
          )}
          {showBlock && isCancellable && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={handleCancel}
              className="min-h-11 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
            >
              {busyAction === "cancel" ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" className="text-white" />
                  Cancelling…
                </span>
              ) : (
                "Cancel booking"
              )}
            </button>
          )}
          {showBlock && msg ? <span className="block text-xs text-stone-600">{msg}</span> : null}
          {showReschedule ? (
            <RescheduleBookingPanel
              bookingId={bookingId}
              bookingStatus={bookingStatus}
              participantCount={participantCount}
              seatType={seatType}
              onSuccess={() => router.refresh()}
              className={showBlock ? "!border-t-0 !pt-3" : "!border-t-0 !pt-0"}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
