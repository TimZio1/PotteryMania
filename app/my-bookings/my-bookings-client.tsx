"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SkeletonText } from "@/components/ui/skeleton";
import { platformUi } from "@/lib/ui-styles";
import { RescheduleBookingPanel } from "@/components/bookings/reschedule-booking-panel";
import { AddToCalendarButtons } from "@/components/bookings/add-to-calendar-buttons";
import {
  humanBookingStatus,
  humanPaymentStatus,
  humanRefundOutcome,
  prettifySeatKey,
} from "@/lib/status-labels";

type Booking = {
  id: string;
  participantCount: number;
  bookingStatus: string;
  paymentStatus: string;
  totalAmountCents: number;
  depositAmountCents: number;
  remainingBalanceCents: number;
  depositPaidAt: string | null;
  remainderPaidAt: string | null;
  remainderPaymentLink: string | null;
  ticketRef: string | null;
  seatType: string | null;
  notes: string | null;
  bookingAddOns: { addOnName: string; quantity: number; unitPriceCents: number }[];
  intakeResponses: { labelSnapshot: string; value: string; includeInInvoiceSnapshot: boolean }[];
  reviews: { id: string }[];
  experience: { id: string; title: string };
  slot: { id: string; slotDate: string; startTime: string; endTime: string; status: string };
  studio: { displayName: string };
  cancellations: { cancelledByRole: string; refundOutcome: string; createdAt: string }[];
};

type CalendarLinkPayload = { httpsUrl: string; webcalUrl: string; note: string };

const ACTIVE_QR_STATUSES = new Set([
  "pending",
  "awaiting_vendor_approval",
  "confirmed",
  "completed",
  "cancellation_requested",
]);

export function MyBookingsClient({ initialMessage = "" }: { initialMessage?: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(initialMessage);
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
      if (!cancelled) setCalendarLinkErr("We couldn’t load your calendar link. Try again later.");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCancel(bookingId: string) {
    if (!confirm("Cancel this booking? The studio’s refund policy sets what (if anything) gets refunded.")) return;
    setActionMsg("");
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Participant requested cancellation" }),
    });
    const data = await res.json();
    if (res.ok) {
      setActionMsg(`Booking cancelled. ${humanRefundOutcome(data.refundOutcome)}.`);
      load();
    } else {
      setActionMsg(`We couldn’t cancel this booking. ${data.error ?? "Try again."}`);
    }
  }

  async function handlePayRemainder(bookingId: string) {
    setActionMsg("");
    const res = await fetch(`/api/bookings/${bookingId}/pay-remainder`, { method: "POST" });
    const data = await res.json();
    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    setActionMsg(`We couldn’t open the payment page. ${data.error ?? "Try again."}`);
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
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">My bookings</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Every class you&rsquo;ve booked — tickets, calendar links, and receipts in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/my-waitlist" className={`${platformUi.buttonSecondary} text-center`}>
            Waitlist
          </Link>
          <Link href="/my-loyalty" className={`${platformUi.buttonSecondary} text-center`}>
            Points
          </Link>
          <Link href="/my-packages" className={`${platformUi.buttonSecondary} text-center`}>
            Packages
          </Link>
        </div>
      </div>

      {actionMsg ? (
        <div className="mt-6 rounded-xl border border-[var(--border)]/80 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)] shadow-(--pm-shadow-rest)">
          {actionMsg}
        </div>
      ) : null}

      {calendarLinkErr ? (
        <p className="mt-4 text-sm text-[var(--muted)]">{calendarLinkErr}</p>
      ) : null}

      {calendarLink ? (
        <div className={`${platformUi.cardMuted} mt-6 space-y-3`}>
          <p className="text-sm font-medium text-[var(--foreground)]">Add your classes to your calendar</p>
          <p className="text-xs text-[var(--muted)]">{calendarLink.note}</p>
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
                  setCalendarLinkErr("We couldn’t copy the link. Copy it by hand instead.");
                }
              }}
            >
              {copied ? "Copied!" : "Copy subscribe link"}
            </button>
          </div>
          <label className={platformUi.label} htmlFor="cal-feed-url">
            Subscribe link
          </label>
          <input
            id="cal-feed-url"
            readOnly
            value={calendarLink.httpsUrl}
            className={`${platformUi.input} font-mono text-sm`}
            onFocus={(e) => e.target.select()}
          />
          <p className={platformUi.helper}>
            Paste this into Apple Calendar (File → New Calendar Subscription) or Google Calendar (Add calendar → From URL). Or{" "}
            <a href={calendarLink.webcalUrl} className="font-medium text-[var(--foreground)] underline underline-offset-2 hover:text-[var(--accent)]">
              open it straight away
            </a>
            .
          </p>
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        {bookings.length === 0 ? (
          <div className={`${platformUi.cardMuted}`}>
            <p className="font-medium text-[var(--foreground)]">Nothing booked yet</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Ready for your first class? Find one that fits your week.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/classes" className={platformUi.buttonSecondary}>Find a class</Link>
              <Link href="/studios" className={platformUi.buttonSecondary}>Browse studios</Link>
            </div>
          </div>
        ) : null}
        {bookings.map((b) => (
          <div key={b.id} className={platformUi.card}>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--foreground)]">{b.experience.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{b.studio.displayName}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {b.slot.slotDate.slice(0, 10)} · {b.slot.startTime}–{b.slot.endTime}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{b.participantCount} {b.participantCount === 1 ? "guest" : "guests"}</p>
                {b.seatType ? <p className="mt-1 text-sm text-[var(--muted)]">Seat: {prettifySeatKey(b.seatType)}</p> : null}
                {b.bookingAddOns.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--muted)]">
                    <p className="font-medium text-[var(--foreground)]">Add-ons</p>
                    <ul className="mt-2 space-y-1">
                      {b.bookingAddOns.map((entry, index) => (
                        <li key={`${b.id}-addon-${index}`}>
                          {entry.addOnName}
                          {entry.quantity > 1 ? ` × ${entry.quantity}` : ""} · +€
                          {((entry.unitPriceCents * entry.quantity) / 100).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {b.intakeResponses.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--muted)]">
                    <p className="font-medium text-[var(--foreground)]">Your answers</p>
                    <dl className="mt-2 space-y-2">
                      {b.intakeResponses.map((entry, index) => (
                        <div key={`${b.id}-intake-${index}`}>
                          <dt className="font-medium text-[var(--foreground)]">{entry.labelSnapshot}</dt>
                          <dd className="whitespace-pre-wrap">{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
                {b.notes ? (
                  <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--muted)]">
                    <p className="font-medium text-[var(--foreground)]">Your note to the studio</p>
                    <p className="mt-2 whitespace-pre-wrap">{b.notes}</p>
                  </div>
                ) : null}
                {b.ticketRef ? <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Booking code: {b.ticketRef}</p> : null}
                {b.ticketRef && ACTIVE_QR_STATUSES.has(b.bookingStatus) ? (
                  <div className="mt-4 inline-flex rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/bookings/${b.id}/ticket-qr`}
                      alt={`QR ticket for ${b.ticketRef}`}
                      className="h-32 w-32 rounded-lg"
                    />
                  </div>
                ) : null}
              </div>
              <div className="text-left sm:text-right">
                <p className="text-lg font-semibold text-[var(--foreground)]">€{(b.totalAmountCents / 100).toFixed(2)}</p>
                {b.remainingBalanceCents > 0 ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Paid €{(b.depositAmountCents / 100).toFixed(2)} today · €
                    {(b.remainingBalanceCents / 100).toFixed(2)} when you arrive
                  </p>
                ) : null}
                {b.remainderPaidAt ? (
                  <p className="mt-1 text-xs text-emerald-400">
                    Balance paid {new Date(b.remainderPaidAt).toLocaleDateString()}
                  </p>
                ) : null}
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  {humanBookingStatus(b.bookingStatus)} · {humanPaymentStatus(b.paymentStatus)}
                </p>
                {b.cancellations.length > 0 ? (
                  <p className="mt-2 text-xs text-red-400">
                    Cancelled by {b.cancellations[0].cancelledByRole === "vendor" ? "the studio" : b.cancellations[0].cancelledByRole} — {humanRefundOutcome(b.cancellations[0].refundOutcome)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 space-y-4 border-t border-[var(--border)]/80 pt-4">
              <AddToCalendarButtons bookingId={b.id} bookingStatus={b.bookingStatus} visualMode="platform" />
              <RescheduleBookingPanel
                bookingId={b.id}
                bookingStatus={b.bookingStatus}
                participantCount={b.participantCount}
                seatType={b.seatType}
                onSuccess={load}
              />
              {b.remainingBalanceCents > 0 ? (
                <button
                  type="button"
                  onClick={() => handlePayRemainder(b.id)}
                  className={platformUi.buttonSecondary}
                >
                  Pay the balance now
                </button>
              ) : null}
              {isCancellable(b.bookingStatus) ? (
                <button
                  type="button"
                  onClick={() => handleCancel(b.id)}
                  className="rounded-full border border-red-400/30 bg-[var(--surface)] px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-950/30"
                >
                  Cancel this booking
                </button>
              ) : null}
              {b.bookingStatus === "completed" && b.reviews.length === 0 ? (
                <Link
                  href={`/reviews/new?booking=${encodeURIComponent(b.id)}`}
                  className="inline-flex rounded-full border border-[var(--accent)] bg-[var(--accent-muted)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--surface-elevated)]"
                >
                  Leave a review
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
