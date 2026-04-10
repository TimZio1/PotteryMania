"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SkeletonText } from "@/components/ui/skeleton";
import { platformUi } from "@/lib/ui-styles";
import { RescheduleBookingPanel } from "@/components/bookings/reschedule-booking-panel";
import { AddToCalendarButtons } from "@/components/bookings/add-to-calendar-buttons";

type Booking = {
  id: string;
  participantCount: number;
  bookingStatus: string;
  paymentStatus: string;
  totalAmountCents: number;
  depositAmountCents: number;
  remainingBalanceCents: number;
  ticketRef: string | null;
  seatType: string | null;
  experience: { id: string; title: string };
  slot: { id: string; slotDate: string; startTime: string; endTime: string; status: string };
  studio: { displayName: string };
  cancellations: { cancelledByRole: string; refundOutcome: string; createdAt: string }[];
};

type CalendarLinkPayload = { httpsUrl: string; webcalUrl: string; note: string };

export function MyBookingsClient() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [calendarLink, setCalendarLink] = useState<CalendarLinkPayload | null>(null);
  const [calendarLinkErr, setCalendarLinkErr] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/my-bookings");
    if (res.ok) {
      const data = await res.json();
      setBookings(data.bookings);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/my-bookings/calendar-link");
      if (!res.ok) return;
      const data = (await res.json()) as CalendarLinkPayload;
      if (!cancelled) setCalendarLink(data);
    })().catch(() => {
      if (!cancelled) setCalendarLinkErr("Could not load calendar link.");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCancel(bookingId: string) {
    if (!confirm("Cancel this booking? Refunds follow the studio’s policy.")) return;
    setActionMsg("");
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Customer requested cancellation" }),
    });
    const data = await res.json();
    if (res.ok) {
      setActionMsg(`Cancelled. Refund outcome: ${data.refundOutcome}`);
      load();
    } else {
      setActionMsg(`Could not cancel: ${data.error}`);
    }
  }

  const isCancellable = (status: string) =>
    status === "pending" || status === "confirmed" || status === "awaiting_vendor_approval";

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-10" role="status" aria-busy="true" aria-label="Loading bookings">
        <div className={`${platformUi.card} space-y-4`}>
          <SkeletonText lines={1} className="max-w-xs" />
          <SkeletonText lines={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={platformUi.overline}>Bookings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">My bookings</h1>
          <p className="mt-2 text-sm text-zinc-400">Classes and experiences you&apos;ve reserved.</p>
        </div>
        <Link href="/my-waitlist" className={`${platformUi.buttonSecondary} text-center sm:!w-auto`}>
          View waitlist
        </Link>
      </div>

      {actionMsg ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-200">
          {actionMsg}
        </div>
      ) : null}

      {calendarLinkErr ? (
        <p className="mt-4 text-sm text-zinc-500">{calendarLinkErr}</p>
      ) : null}

      {calendarLink ? (
        <div className={`${platformUi.cardMuted} mt-6 space-y-3`}>
          <p className="text-sm font-medium text-stone-800">Calendar</p>
          <p className="text-xs text-stone-600">{calendarLink.note}</p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/my-bookings/calendar" className={platformUi.buttonSecondary}>
              Download all (.ics)
            </a>
            <button
              type="button"
              className={platformUi.buttonSecondary}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(calendarLink.httpsUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setCalendarLinkErr("Could not copy to clipboard.");
                }
              }}
            >
              {copied ? "Copied" : "Copy subscribe URL"}
            </button>
          </div>
          <label className={platformUi.label} htmlFor="cal-feed-url">
            Subscribe URL (HTTPS)
          </label>
          <input
            id="cal-feed-url"
            readOnly
            value={calendarLink.httpsUrl}
            className={`${platformUi.input} font-mono text-sm`}
            onFocus={(e) => e.target.select()}
          />
          <p className={platformUi.helper}>
            In Apple Calendar: File → New Calendar Subscription. Google Calendar: Settings → Add calendar → From URL.
            You can also try{" "}
            <a href={calendarLink.webcalUrl} className="font-medium text-zinc-200 underline underline-offset-2 hover:text-white">
              open in calendar app (webcal)
            </a>
            .
          </p>
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        {bookings.length === 0 ? (
          <div className={`${platformUi.cardMuted}`}>
            <p className="font-medium text-zinc-100">No bookings yet</p>
            <p className="mt-2 text-sm text-zinc-400">
              <Link href="/classes" className="font-medium text-zinc-200 underline underline-offset-2 hover:text-white">
                Browse classes
              </Link>{" "}
              to get started.
            </p>
          </div>
        ) : null}
        {bookings.map((b) => (
          <div key={b.id} className={platformUi.card}>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-50">{b.experience.title}</p>
                <p className="mt-1 text-sm text-zinc-500">{b.studio.displayName}</p>
                <p className="mt-2 text-sm text-zinc-400">
                  {b.slot.slotDate.slice(0, 10)} · {b.slot.startTime}–{b.slot.endTime}
                </p>
                <p className="mt-1 text-sm text-zinc-400">{b.participantCount} participants</p>
                {b.seatType ? <p className="mt-1 text-sm text-zinc-400">Seat: {b.seatType}</p> : null}
                {b.ticketRef ? <p className="mt-2 text-sm font-medium text-zinc-200">Ref: {b.ticketRef}</p> : null}
              </div>
              <div className="text-left sm:text-right">
                <p className="text-lg font-semibold text-zinc-50">€{(b.totalAmountCents / 100).toFixed(2)}</p>
                {b.remainingBalanceCents > 0 ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    Paid online €{(b.depositAmountCents / 100).toFixed(2)} · Balance €
                    {(b.remainingBalanceCents / 100).toFixed(2)}
                  </p>
                ) : null}
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {b.bookingStatus} · {b.paymentStatus}
                </p>
                {b.cancellations.length > 0 ? (
                  <p className="mt-2 text-xs text-red-400">
                    Cancelled ({b.cancellations[0].cancelledByRole}) — {b.cancellations[0].refundOutcome}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
              <AddToCalendarButtons bookingId={b.id} bookingStatus={b.bookingStatus} visualMode="platform" />
              <a
                href={`/api/bookings/${b.id}/calendar`}
                className={`${platformUi.buttonSecondary} inline-flex text-center`}
              >
                Download .ics (same file)
              </a>
              <RescheduleBookingPanel
                bookingId={b.id}
                bookingStatus={b.bookingStatus}
                participantCount={b.participantCount}
                seatType={b.seatType}
                onSuccess={load}
              />
              {isCancellable(b.bookingStatus) ? (
                <button
                  type="button"
                  onClick={() => handleCancel(b.id)}
                  className="rounded-full border border-red-500/40 bg-transparent px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                >
                  Cancel booking
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
