"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";
import type { StudioBookingListRow } from "@/lib/studio-bookings-list-types";
import VendorBookingActions from "@/components/dashboard/vendor-booking-actions";
import {
  bookingStatusBadgeClass,
  formatBookingStatusLabel,
  formatPaymentStatusLabel,
  paymentStatusBadgeClass,
} from "@/lib/bookings/status";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "awaiting_vendor_approval", label: "Awaiting approval" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancellation_requested", label: "Cancellation requested" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-show" },
  { value: "cancelled_by_customer", label: "Cancelled (participant)" },
  { value: "cancelled_by_vendor", label: "Cancelled (studio)" },
  { value: "cancelled_by_admin", label: "Cancelled (admin)" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Partially refunded" },
];

function slotDateKey(iso: string): string {
  return iso.slice(0, 10);
}

export default function StudioBookingsClient({
  studioId,
  bookings,
  pendingApprovalCount,
  calendarSyncByBooking = {},
}: {
  studioId: string;
  bookings: StudioBookingListRow[];
  pendingApprovalCount: number;
  calendarSyncByBooking?: Record<string, { status: string; message: string | null; at: string }>;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [experienceId, setExperienceId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<StudioBookingListRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchMsg, setBatchMsg] = useState<string | null>(null);

  const experiences = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of bookings) m.set(b.experience.id, b.experience.title);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [bookings]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter && b.bookingStatus !== statusFilter) return false;
      if (experienceId && b.experience.id !== experienceId) return false;
      const d = slotDateKey(b.slot.slotDate);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (!qq) return true;
      return (
        b.customerName.toLowerCase().includes(qq) ||
        b.customerEmail.toLowerCase().includes(qq) ||
        (b.ticketRef?.toLowerCase().includes(qq) ?? false) ||
        b.experience.title.toLowerCase().includes(qq)
      );
    });
  }, [bookings, q, statusFilter, experienceId, dateFrom, dateTo]);

  const selectableConfirmed = useMemo(
    () => filtered.filter((b) => b.bookingStatus === "confirmed").map((b) => b.id),
    [filtered],
  );

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllConfirmed = () => {
    setSelectedIds(new Set(selectableConfirmed));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const runBatchAttended = async () => {
    const ids = [...selectedIds].filter((id) => {
      const b = bookings.find((x) => x.id === id);
      return b?.bookingStatus === "confirmed";
    });
    if (ids.length === 0) return;
    if (!confirm(`Mark ${ids.length} booking(s) as attended / completed?`)) return;
    setBatchBusy(true);
    setBatchMsg(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/bookings/mark-attended-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingIds: ids }),
      });
      const data = (await res.json()) as { error?: string; marked?: number };
      if (!res.ok) throw new Error(data.error ?? "Batch failed");
      setBatchMsg(`Marked ${data.marked ?? 0} as completed.`);
      clearSelection();
      setSelected((cur) => {
        if (!cur) return null;
        if (ids.includes(cur.id)) return null;
        return cur;
      });
      router.refresh();
    } catch (e) {
      setBatchMsg(e instanceof Error ? e.message : "Batch failed");
    } finally {
      setBatchBusy(false);
    }
  };

  const openRow = useCallback((b: StudioBookingListRow) => {
    setSelected(b);
  }, []);

  useEffect(() => {
    setSelected((cur) => {
      if (!cur) return null;
      return bookings.find((b) => b.id === cur.id) ?? null;
    });
  }, [bookings]);

  return (
    <div className="relative grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {pendingApprovalCount > 0 && (
          <p className="text-sm text-amber-900">
            {pendingApprovalCount} reservation(s) awaiting your approval (payment captured; slot reserved).
          </p>
        )}

        <div className="sticky top-0 z-10 space-y-3 rounded-xl border border-stone-200 bg-stone-50/95 p-4 backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <label className="block min-w-[160px] flex-1">
              <span className={ui.label}>Search</span>
              <input
                className={cn(ui.input, "mt-1")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Participant, email, experience, ref…"
              />
            </label>
            <label className="block w-full min-w-[140px] lg:w-48">
              <span className={ui.label}>Status</span>
              <select
                className={cn(ui.input, "mt-1")}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-full min-w-[140px] lg:w-56">
              <span className={ui.label}>Class</span>
              <select
                className={cn(ui.input, "mt-1")}
                value={experienceId}
                onChange={(e) => setExperienceId(e.target.value)}
              >
                <option value="">All classes</option>
                {experiences.map(([id, title]) => (
                  <option key={id} value={id}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-full min-w-[130px] lg:w-40">
              <span className={ui.label}>From</span>
              <input
                type="date"
                className={cn(ui.input, "mt-1")}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="block w-full min-w-[130px] lg:w-40">
              <span className={ui.label}>To</span>
              <input
                type="date"
                className={cn(ui.input, "mt-1")}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3">
            <span className="text-xs font-medium text-stone-600">Batch (confirmed only)</span>
            <button type="button" className={ui.buttonGhost} onClick={selectAllConfirmed} disabled={selectableConfirmed.length === 0}>
              Select all in view
            </button>
            <button type="button" className={ui.buttonGhost} onClick={clearSelection} disabled={selectedIds.size === 0}>
              Clear
            </button>
            <button
              type="button"
              className={cn(ui.buttonPrimary, "min-h-10")}
              disabled={batchBusy || selectedIds.size === 0}
              onClick={() => void runBatchAttended()}
            >
              {batchBusy ? "Working…" : `Mark ${selectedIds.size || "…"} attended`}
            </button>
            {batchMsg ? <span className="text-xs text-stone-600">{batchMsg}</span> : null}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th className="w-10 px-2 py-3" aria-label="Select" />
                <th className="px-4 py-3">Experience</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                    No reservations match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((booking) => {
                  const canSelect = booking.bookingStatus === "confirmed";
                  const isSel = selected?.id === booking.id;
                  return (
                    <tr
                      key={booking.id}
                      className={cn(
                        "cursor-pointer border-b border-stone-100 last:border-0 hover:bg-amber-50/50",
                        isSel && "bg-amber-50",
                        booking.bookingStatus === "awaiting_vendor_approval" && "bg-amber-50/40",
                      )}
                      tabIndex={0}
                      role="button"
                      onClick={() => openRow(booking)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openRow(booking);
                        }
                      }}
                    >
                      <td className="px-2 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                        {canSelect ? (
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-stone-300"
                            checked={selectedIds.has(booking.id)}
                            onChange={() => toggleOne(booking.id)}
                            aria-label={`Select ${booking.customerName}`}
                          />
                        ) : (
                          <span className="inline-block w-4" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-stone-900">
                        <Link
                          href={`/classes/${booking.experience.id}`}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {booking.experience.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {slotDateKey(booking.slot.slotDate)}
                        <br />
                        {booking.slot.startTime}–{booking.slot.endTime}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {booking.customerName}
                        <br />
                        <span className="text-xs">{booking.customerEmail}</span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        <div className="flex flex-col gap-1">
                          <span
                            className={cn(
                              "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              bookingStatusBadgeClass(booking.bookingStatus),
                            )}
                          >
                            {formatBookingStatusLabel(booking.bookingStatus)}
                          </span>
                          <span
                            className={cn(
                              "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              paymentStatusBadgeClass(booking.paymentStatus),
                            )}
                          >
                            {formatPaymentStatusLabel(booking.paymentStatus)} payment
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-600">€{(booking.totalAmountCents / 100).toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <aside
          className={cn(
            ui.card,
            "lg:sticky lg:top-20 h-fit space-y-4 border-amber-200/80 shadow-md max-lg:fixed max-lg:inset-x-4 max-lg:bottom-4 max-lg:z-20 max-lg:max-h-[88vh] overflow-y-auto",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500">Reservation</p>
              <p className="mt-1 text-sm font-medium text-amber-950">{selected.experience.title}</p>
            </div>
            <button type="button" className={ui.buttonGhost} onClick={() => setSelected(null)}>
              Close
            </button>
          </div>

          <dl className="space-y-2 text-sm text-stone-600">
            <div>
              <dt className={ui.label}>When</dt>
              <dd>
                {slotDateKey(selected.slot.slotDate)} {selected.slot.startTime}–{selected.slot.endTime}
              </dd>
            </div>
            <div>
              <dt className={ui.label}>Participant</dt>
              <dd>
                {selected.customerName}
                <br />
                {selected.customerEmail}
                {selected.customerPhone ? (
                  <>
                    <br />
                    {selected.customerPhone}
                  </>
                ) : null}
              </dd>
            </div>
            {selected.ticketRef ? (
              <div>
                <dt className={ui.label}>Reference</dt>
                <dd className="font-mono text-xs">{selected.ticketRef}</dd>
              </div>
            ) : null}
            <div>
              <dt className={ui.label}>Participants</dt>
              <dd>{selected.participantCount}</dd>
            </div>
            {selected.seatType ? (
              <div>
                <dt className={ui.label}>Seat</dt>
                <dd>{selected.seatType}</dd>
              </div>
            ) : null}
            <div>
              <dt className={ui.label}>Status</dt>
              <dd className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                    bookingStatusBadgeClass(selected.bookingStatus),
                  )}
                >
                  {formatBookingStatusLabel(selected.bookingStatus)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                    paymentStatusBadgeClass(selected.paymentStatus),
                  )}
                >
                  {formatPaymentStatusLabel(selected.paymentStatus)} payment
                </span>
              </dd>
            </div>
            <div>
              <dt className={ui.label}>Amount</dt>
              <dd>€{(selected.totalAmountCents / 100).toFixed(2)}</dd>
            </div>
            {selected.notes ? (
              <div>
                <dt className={ui.label}>Participant notes</dt>
                <dd className="whitespace-pre-wrap">{selected.notes}</dd>
              </div>
            ) : null}
            {selected.addOns.length > 0 ? (
              <div>
                <dt className={ui.label}>Add-ons</dt>
                <dd>
                  <ul className="space-y-1">
                    {selected.addOns.map((entry, index) => (
                      <li key={`${selected.id}-addon-${index}`}>
                        {entry.name}
                        {entry.quantity > 1 ? ` x${entry.quantity}` : ""} · +€
                        {((entry.unitPriceCents * entry.quantity) / 100).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            {selected.intakeResponses.length > 0 ? (
              <div>
                <dt className={ui.label}>Booking answers</dt>
                <dd>
                  <dl className="space-y-2">
                    {selected.intakeResponses.map((entry, index) => (
                      <div key={`${selected.id}-intake-${index}`}>
                        <dt className="font-medium text-stone-700">{entry.label}</dt>
                        <dd className="whitespace-pre-wrap">{entry.value}</dd>
                      </div>
                    ))}
                  </dl>
                </dd>
              </div>
            ) : null}
            {selected.cancellationPolicySummary ? (
              <div>
                <dt className={ui.label}>Cancellation policy</dt>
                <dd>{selected.cancellationPolicySummary}</dd>
              </div>
            ) : null}
            {selected.remainingBalanceCents > 0 ? (
              <div className="text-xs">
                Paid €{(selected.depositAmountCents / 100).toFixed(2)} · Due €
                {(selected.remainingBalanceCents / 100).toFixed(2)}
              </div>
            ) : null}
            {selected.depositPaidAt ? (
              <div className="text-xs text-stone-500">
                Deposit paid {new Date(selected.depositPaidAt).toLocaleDateString()}
              </div>
            ) : null}
            {selected.remainderPaidAt ? (
              <div className="text-xs text-emerald-700">
                Remaining balance paid {new Date(selected.remainderPaidAt).toLocaleDateString()}
              </div>
            ) : null}
            {selected.remainderPaymentLink ? (
              <div className="text-xs text-sky-700">
                Remaining-balance link ready
              </div>
            ) : null}
            {selected.lastCancellation ? (
              <div className="rounded-lg border border-red-100 bg-red-50/80 p-2 text-xs text-red-900">
                Cancelled by {selected.lastCancellation.cancelledByRole.replace("vendor", "studio")}
                {selected.lastCancellation.refundOutcome ? ` · ${selected.lastCancellation.refundOutcome}` : null}
              </div>
            ) : null}
          </dl>

          <div className="border-t border-stone-100 pt-3">
            <VendorBookingActions
              studioId={studioId}
              bookingId={selected.id}
              bookingStatus={selected.bookingStatus}
              paymentStatus={selected.paymentStatus}
              remainingBalanceCents={selected.remainingBalanceCents}
              participantCount={selected.participantCount}
              seatType={selected.seatType}
              calendarSync={calendarSyncByBooking[selected.id] ?? null}
            />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
