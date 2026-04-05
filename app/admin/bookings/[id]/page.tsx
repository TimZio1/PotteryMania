import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth-session";
import { findAdminBookingById } from "@/lib/admin-bookings-query";
import { isReschedulable } from "@/lib/bookings/status";
import { RescheduleBookingPanel } from "@/components/bookings/reschedule-booking-panel";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function eur(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(cents / 100);
}

function JsonBlock({ value, label }: { value: unknown; label: string }) {
  if (value == null) {
    return (
      <div>
        <p className={ui.label}>{label}</p>
        <p className="mt-1 text-sm text-stone-500">—</p>
      </div>
    );
  }
  return (
    <div>
      <p className={ui.label}>{label}</p>
      <pre className="mt-1 max-h-48 overflow-auto rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default async function AdminBookingDetailPage({ params }: Props) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/unauthorized-admin");

  const { id } = await params;
  const booking = await findAdminBookingById(id);
  if (!booking) notFound();

  const sessionDay = booking.slot.slotDate.toISOString().slice(0, 10);
  const orderLinks = booking.orderItems
    .map((oi) => oi.order)
    .filter(Boolean)
    .filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Commerce</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-amber-950">Booking</h1>
          {booking.ticketRef ? (
            <p className="mt-1 font-mono text-sm text-amber-900">{booking.ticketRef}</p>
          ) : null}
          <p className="mt-1 font-mono text-xs text-stone-500">{booking.id}</p>
        </div>
        <Link href="/admin/bookings" className={ui.buttonSecondary}>
          ← All bookings
        </Link>
      </div>

      <div className={`${ui.card} mt-8 space-y-4`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className={ui.label}>Session (UTC)</p>
            <p className="mt-1 text-sm font-medium text-stone-800">
              {sessionDay} · {booking.slot.startTime}–{booking.slot.endTime}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Slot <span className="font-mono">{booking.slot.id}</span>
            </p>
          </div>
          <div>
            <p className={ui.label}>Experience</p>
            <p className="mt-1 text-sm font-medium text-stone-800">{booking.experience.title}</p>
            <p className="mt-1 text-sm text-stone-600">
              <Link href={`/studios/${booking.studio.id}`} className="text-amber-900 hover:underline">
                {booking.studio.displayName}
              </Link>
            </p>
          </div>
          <div>
            <p className={ui.label}>Booking status</p>
            <p className="mt-1">
              <code className="text-sm">{booking.bookingStatus}</code>
            </p>
          </div>
          <div>
            <p className={ui.label}>Payment</p>
            <p className="mt-1">
              <code className="text-sm">{booking.paymentStatus}</code>
            </p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className={ui.label}>Line total</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-amber-950">{eur(booking.totalAmountCents)}</p>
          </div>
          <div>
            <p className={ui.label}>Deposit collected</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-stone-800">{eur(booking.depositAmountCents)}</p>
          </div>
          <div>
            <p className={ui.label}>Remaining balance</p>
            <p className="mt-1 text-sm tabular-nums text-stone-700">{eur(booking.remainingBalanceCents)}</p>
          </div>
          <div>
            <p className={ui.label}>Commission / vendor</p>
            <p className="mt-1 text-xs tabular-nums text-stone-600">
              {eur(booking.commissionAmountCents)} / {eur(booking.vendorAmountCents)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
          <div>
            <p className={ui.label}>Customer</p>
            <p className="mt-1 text-sm font-medium text-stone-800">{booking.customerName}</p>
            <p className="text-sm text-stone-600">{booking.customerEmail}</p>
            {booking.customerPhone ? <p className="text-sm text-stone-600">{booking.customerPhone}</p> : null}
            {booking.customerUser ? (
              <p className="mt-2">
                <Link
                  href={`/admin/users/${booking.customerUser.id}`}
                  className="text-sm font-medium text-amber-900 hover:underline"
                >
                  User: {booking.customerUser.email}
                </Link>
              </p>
            ) : null}
          </div>
          <div>
            <p className={ui.label}>Participants</p>
            <p className="mt-1 text-sm text-stone-800">{booking.participantCount}</p>
            {booking.seatType ? (
              <p className="mt-1 text-xs text-stone-500">
                Seat type <code>{booking.seatType}</code>
              </p>
            ) : null}
            <p className={ui.label}>Created</p>
            <p className="mt-1 text-sm text-stone-700">
              {booking.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC
            </p>
          </div>
        </div>

        {booking.notes ? (
          <div className="border-t border-stone-100 pt-4">
            <p className={ui.label}>Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{booking.notes}</p>
          </div>
        ) : null}

        <div className="border-t border-stone-100 pt-4">
          <p className={ui.label}>Linked orders</p>
          {orderLinks.length === 0 ? (
            <p className="mt-1 text-sm text-stone-500">No order line items point to this booking.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {orderLinks.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-amber-900 hover:underline">
                    {o.id}
                  </Link>
                  <span className="ml-2 text-xs text-stone-500">
                    <code>{o.orderStatus}</code> · <code>{o.paymentStatus}</code>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
          <JsonBlock value={booking.cancellationPolicySnapshot} label="Cancellation policy snapshot" />
          <div>
            <p className={ui.label}>Reminders</p>
            <p className="mt-1 text-xs text-stone-600">
              Scheduled: {booking.reminderScheduledAt?.toISOString?.() ?? "—"}
            </p>
            <p className="text-xs text-stone-600">Sent: {booking.reminderSentAt?.toISOString?.() ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className={`${ui.card} mt-6`}>
        <h2 className="text-lg font-semibold text-amber-950">Audit trail</h2>
        <p className="mt-1 text-sm text-stone-600">
          Immutable log of payment capture, reschedules, cancellations, and Stripe refund attempts (from{" "}
          <code className="text-xs">booking_audit_log</code>).
        </p>
        {booking.auditLogs.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">No audit entries yet.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {booking.auditLogs.map((log) => (
              <li key={log.id} className="rounded-lg border border-stone-100 bg-stone-50/80 p-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-stone-500">
                  <span className="whitespace-nowrap">{log.createdAt.toISOString().slice(0, 19)} UTC</span>
                  <code className="text-amber-950">{log.actionType}</code>
                  {log.actorRole ? <code>{log.actorRole}</code> : null}
                  {log.actorUser ? (
                    <Link href={`/admin/users/${log.actorUser.id}`} className="text-amber-900 hover:underline">
                      {log.actorUser.email}
                    </Link>
                  ) : log.actorUserId ? (
                    <span className="font-mono">user {log.actorUserId.slice(0, 8)}…</span>
                  ) : null}
                </div>
                {log.payload != null ? (
                  <pre className="mt-2 max-h-36 overflow-auto rounded-md border border-stone-200 bg-white p-2 text-[11px] leading-snug text-stone-700">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isReschedulable(booking.bookingStatus) ? (
        <div className={`${ui.card} mt-6`}>
          <h2 className="text-lg font-semibold text-amber-950">Move session</h2>
          <p className="mt-1 text-sm text-stone-600">
            Reassigns the booking to another open slot with enough capacity. Slot counts and reschedule history update
            automatically.
          </p>
          <RescheduleBookingPanel
            bookingId={booking.id}
            bookingStatus={booking.bookingStatus}
            participantCount={booking.participantCount}
            seatType={booking.seatType}
            className="!border-t-0 !pt-4"
          />
        </div>
      ) : null}

      {booking.cancellations.length > 0 ? (
        <div className={`${ui.card} mt-6`}>
          <h2 className="text-lg font-semibold text-amber-950">Cancellations</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {booking.cancellations.map((c) => (
              <li key={c.id} className="rounded-lg border border-stone-100 bg-stone-50/80 p-3">
                <div className="flex flex-wrap gap-2 text-xs text-stone-500">
                  <span>{c.createdAt.toISOString().slice(0, 19)} UTC</span>
                  <code>{c.cancelledByRole}</code>
                  {c.refundOutcome ? <code>{c.refundOutcome}</code> : null}
                  {c.refundAmountCents ? <span>refund {eur(c.refundAmountCents)}</span> : null}
                </div>
                {c.cancellationReason ? <p className="mt-2 text-stone-700">{c.cancellationReason}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {booking.reschedules.length > 0 ? (
        <div className={`${ui.card} mt-6`}>
          <h2 className="text-lg font-semibold text-amber-950">Reschedules</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {booking.reschedules.map((r) => (
              <li key={r.id} className="rounded-lg border border-stone-100 bg-stone-50/80 p-3">
                <div className="text-xs text-stone-500">{r.createdAt.toISOString().slice(0, 19)} UTC</div>
                <p className="mt-2 text-stone-700">
                  <span className="font-medium">From</span>{" "}
                  {r.originalSlot.slotDate.toISOString().slice(0, 10)} {r.originalSlot.startTime}
                  <span className="mx-1 text-stone-400">→</span>
                  <span className="font-medium">To</span> {r.newSlot.slotDate.toISOString().slice(0, 10)}{" "}
                  {r.newSlot.startTime}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  By <code>{r.rescheduledByRole}</code>
                  {r.changeFeeCents ? ` · fee ${eur(r.changeFeeCents)}` : ""}
                </p>
                {r.rescheduleReason ? <p className="mt-2 text-stone-600">{r.rescheduleReason}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
