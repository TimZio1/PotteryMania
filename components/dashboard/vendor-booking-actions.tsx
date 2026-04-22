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
  paymentStatus,
  remainingBalanceCents,
  participantCount,
  seatType,
  calendarSync,
}: {
  studioId: string;
  bookingId: string;
  bookingStatus: string;
  paymentStatus?: string;
  remainingBalanceCents?: number;
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
  const canMarkRemainderPaid = (remainingBalanceCents ?? 0) > 0 && paymentStatus === "partial";
  const canSendRemainderLink = (remainingBalanceCents ?? 0) > 0;

  async function handleCancel() {
    if (!confirm("Cancel this booking? The guest will be emailed.")) return;
    setMsg("");
    setBusyAction("cancel");
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Studio cancelled" }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`Cancelled. Refund: ${data.refundOutcome}`);
      router.refresh();
    } else {
      setMsg(data.error || "We couldn't cancel. Try again.");
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
      setMsg("Approved. Guest emailed.");
      router.refresh();
    } else {
      setMsg(data.error || "We couldn't approve. Try again.");
    }
    setBusyAction(null);
  }

  async function handleReject() {
    const reason = prompt("Optional note to the guest (why you're declining):") ?? "";
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
      setMsg("Declined. Guest emailed.");
      router.refresh();
    } else {
      setMsg(data.error || "We couldn't decline. Try again.");
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
      setMsg("Calendar synced.");
      router.refresh();
    } else {
      setMsg(`Calendar sync: ${data.message ?? data.error ?? res.statusText}`);
    }
    setBusyAction(null);
  }

  async function handleMarkCompleted() {
    if (!confirm("Mark this booking as attended?")) return;
    setMsg("");
    setBusyAction("complete");
    const res = await fetch(`/api/bookings/${bookingId}/vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_completed" }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Marked attended.");
      router.refresh();
    } else {
      setMsg(data.error || "We couldn't save. Try again.");
    }
    setBusyAction(null);
  }

  async function handleMarkRemainderPaid() {
    if (!confirm("Mark the balance as paid in person?")) return;
    setMsg("");
    setBusyAction("mark_remainder_paid");
    const res = await fetch(`/api/bookings/${bookingId}/vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_remainder_paid" }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Balance marked paid.");
      router.refresh();
    } else {
      setMsg(data.error || "We couldn't save. Try again.");
    }
    setBusyAction(null);
  }

  async function handleSendRemainderLink() {
    setMsg("");
    setBusyAction("send_remainder_link");
    const res = await fetch(`/api/bookings/${bookingId}/pay-remainder`, {
      method: "POST",
    });
    const data = await res.json();
    if (res.ok && data.url) {
      try {
        await navigator.clipboard.writeText(data.url);
        setMsg("Payment link copied.");
      } catch {
        setMsg(`Payment link: ${data.url}`);
      }
      router.refresh();
    } else {
      setMsg(data.error || "We couldn't create a payment link. Try again.");
    }
    setBusyAction(null);
  }

  const showBlock = needsApproval || isCancellable || canMarkCompleted;
  const showReschedule = isReschedulable(bookingStatus as BookingStatus);
  const showCalStudio =
    (bookingStatus === "confirmed" || bookingStatus === "completed") && Boolean(studioId);

  return (
    <div className="space-y-2">
      <a
        href={`/api/bookings/${bookingId}/calendar`}
        className="inline-block text-xs font-medium text-amber-900 underline underline-offset-2"
      >
        Calendar (.ics)
      </a>
      {showCalStudio ? (
        <div className="text-xs text-[var(--muted)]">
          {calendarSync ? (
            <>
              <span>
                Google Calendar: {calendarSync.status === "success" ? "synced" : "pending or failed"}
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
              <span>Not synced to Google Calendar yet.</span>
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
                "Mark attended"
              )}
            </button>
          )}
          {showBlock && canMarkRemainderPaid && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={handleMarkRemainderPaid}
              className="min-h-11 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-800"
            >
              {busyAction === "mark_remainder_paid" ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" className="text-white" />
                  Saving…
                </span>
              ) : (
                "Mark balance paid"
              )}
            </button>
          )}
          {showBlock && canSendRemainderLink && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={handleSendRemainderLink}
              className="min-h-11 rounded-lg border border-sky-200 bg-white px-4 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
            >
              {busyAction === "send_remainder_link" ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" />
                  Preparing…
                </span>
              ) : (
                "Copy balance payment link"
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
          {showBlock && msg ? <span className="block text-xs text-[var(--muted)]">{msg}</span> : null}
          {showReschedule ? (
            <RescheduleBookingPanel
              bookingId={bookingId}
              bookingStatus={bookingStatus}
              participantCount={participantCount}
              seatType={seatType}
              onSuccess={() => router.refresh()}
              className={showBlock ? "border-t-0! pt-3!" : "border-t-0! pt-0!"}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
