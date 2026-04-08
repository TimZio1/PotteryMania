"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import {
  modalBackdropVariants,
  modalPanelVariants,
  modalPanelVariantsReduced,
  modalTransition,
} from "@/lib/motion-ui";
import { ui } from "@/lib/ui-styles";

export type WearOrderDetailPayload = {
  id: string;
  status: string;
  customerEmail: string;
  customerName: string;
  subtotalCents: number;
  amountTotalCents: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  shippedAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  fulfillmentProvider: string | null;
  trackingNumber: string | null;
  internalNotes: string | null;
  externalFulfillmentRef: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeLinks: { sessionUrl: string | null; paymentUrl: string | null };
  allowedNext: string[];
  items: {
    id: string;
    productNameSnapshot: string;
    variantLabelSnapshot: string | null;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    productSlug: string;
    variantSku: string | null;
  }[];
};

function money(cents: number, cur: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: cur.toUpperCase() }).format(cents / 100);
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-950";
    case "paid":
      return "bg-emerald-100 text-emerald-900";
    case "in_production":
      return "bg-sky-100 text-sky-950";
    case "fulfilled":
      return "bg-violet-100 text-violet-950";
    case "shipped":
      return "bg-slate-200 text-slate-900";
    case "cancelled":
      return "bg-stone-200 text-stone-800";
    case "refunded":
      return "bg-red-100 text-red-900";
    default:
      return "bg-stone-100 text-stone-800";
  }
}

function humanStatus(s: string) {
  return s.replace(/_/g, " ");
}

const ACTION_LABEL: Record<string, string> = {
  paid: "Mark paid (manual — Stripe already paid? only if reconciling)",
  in_production: "Move to in production",
  fulfilled: "Mark fulfilled",
  shipped: "Mark shipped",
  cancelled: "Cancel order",
  refunded: "Mark refunded",
};

function needsReason(next: string) {
  return next === "paid" || next === "cancelled" || next === "refunded";
}

function isDestructive(next: string) {
  return next === "cancelled" || next === "refunded";
}

type Props = { initial: WearOrderDetailPayload };

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function WearOrderDetailClient({ initial }: Props) {
  const reduced = useReducedMotion();
  const panelVariants = reduced ? modalPanelVariantsReduced : modalPanelVariants;
  const transition = modalTransition(reduced);
  const router = useRouter();
  const [notes, setNotes] = useState(initial.internalNotes ?? "");
  const [notesBusy, setNotesBusy] = useState(false);
  const [notesMsg, setNotesMsg] = useState<string | null>(null);

  const [modalNext, setModalNext] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirmDestructive, setConfirmDestructive] = useState(false);
  const [track, setTrack] = useState(initial.trackingNumber ?? "");
  const [provider, setProvider] = useState(initial.fulfillmentProvider ?? "");
  const [extRef, setExtRef] = useState(initial.externalFulfillmentRef ?? "");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setNotes(initial.internalNotes ?? "");
    setTrack(initial.trackingNumber ?? "");
    setProvider(initial.fulfillmentProvider ?? "");
    setExtRef(initial.externalFulfillmentRef ?? "");
  }, [
    initial.externalFulfillmentRef,
    initial.fulfillmentProvider,
    initial.id,
    initial.internalNotes,
    initial.status,
    initial.trackingNumber,
  ]);

  useEffect(() => {
    if (modalNext) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        const first = modalRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        first?.focus();
      });
      return;
    }

    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, [modalNext]);

  const saveNotes = useCallback(async () => {
    setNotesBusy(true);
    setNotesMsg(null);
    try {
      const res = await fetch(`/api/admin/wear-orders/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes: notes }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotesMsg(data.error ?? "Save failed");
        return;
      }
      setNotesMsg("Saved.");
      router.refresh();
    } finally {
      setNotesBusy(false);
    }
  }, [initial.id, notes, router]);

  const submitTransition = useCallback(async () => {
    if (!modalNext) return;
    setActionBusy(true);
    setActionErr(null);
    try {
      const body: Record<string, unknown> = {
        nextStatus: modalNext,
        reason: reason.trim() || undefined,
        confirmDestructive: isDestructive(modalNext) ? confirmDestructive : undefined,
      };
      if (modalNext === "shipped") {
        body.trackingNumber = track.trim() || null;
        body.fulfillmentProvider = provider.trim() || null;
      }
      const res = await fetch(`/api/admin/wear-orders/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionErr(data.error ?? "Update failed");
        return;
      }
      setModalNext(null);
      setReason("");
      setConfirmDestructive(false);
      router.refresh();
    } finally {
      setActionBusy(false);
    }
  }, [confirmDestructive, initial.id, modalNext, provider, reason, router, track]);

  const saveFulfillmentMeta = useCallback(async () => {
    setActionBusy(true);
    setActionErr(null);
    try {
      const res = await fetch(`/api/admin/wear-orders/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: track.trim() || null,
          fulfillmentProvider: provider.trim() || null,
          externalFulfillmentRef: extRef.trim() || null,
          reason: "Fulfillment fields update",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionErr(data.error ?? "Save failed");
        return;
      }
      router.refresh();
    } finally {
      setActionBusy(false);
    }
  }, [extRef, initial.id, provider, router, track]);

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-sm font-semibold capitalize",
              statusBadgeClass(initial.status),
            )}
          >
            {humanStatus(initial.status)}
          </span>
          <p className="mt-3 text-sm text-stone-600">
            Created <span className="font-mono text-xs">{initial.createdAt.slice(0, 19).replace("T", " ")}</span>
            {" · "}
            Updated <span className="font-mono text-xs">{initial.updatedAt.slice(0, 19).replace("T", " ")}</span>
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-950">Lifecycle timestamps</h2>
          <dl className="mt-3 space-y-2 text-sm text-stone-700">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Paid</dt>
              <dd className="font-mono text-xs">{initial.paidAt ? initial.paidAt.slice(0, 19).replace("T", " ") : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Fulfilled</dt>
              <dd className="font-mono text-xs">
                {initial.fulfilledAt ? initial.fulfilledAt.slice(0, 19).replace("T", " ") : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Shipped</dt>
              <dd className="font-mono text-xs">
                {initial.shippedAt ? initial.shippedAt.slice(0, 19).replace("T", " ") : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Cancelled</dt>
              <dd className="font-mono text-xs">
                {initial.cancelledAt ? initial.cancelledAt.slice(0, 19).replace("T", " ") : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Refunded</dt>
              <dd className="font-mono text-xs">
                {initial.refundedAt ? initial.refundedAt.slice(0, 19).replace("T", " ") : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-950">Customer</h2>
          <p className="mt-2 font-medium text-stone-900">{initial.customerName}</p>
          <p className="text-sm text-stone-600">{initial.customerEmail}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-950">Totals</h2>
        <div className="mt-3 flex flex-wrap gap-8 text-sm">
          <div>
            <p className="text-xs text-stone-500">Subtotal</p>
            <p className="mt-1 font-mono text-lg text-stone-900">{money(initial.subtotalCents, initial.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Paid total (Stripe)</p>
            <p className="mt-1 font-mono text-lg text-stone-900">
              {initial.amountTotalCents != null ? money(initial.amountTotalCents, initial.currency) : "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-950">Stripe</h2>
        <div className="mt-3 space-y-2 break-all font-mono text-xs text-stone-600">
          {initial.stripeLinks.sessionUrl ? (
            <p>
              <a href={initial.stripeLinks.sessionUrl} target="_blank" rel="noreferrer" className="text-amber-900 underline">
                Open Checkout session
              </a>
              <span className="ml-2 text-stone-400">{initial.stripeCheckoutSessionId}</span>
            </p>
          ) : (
            <p>Session: {initial.stripeCheckoutSessionId ?? "—"}</p>
          )}
          {initial.stripeLinks.paymentUrl ? (
            <p>
              <a href={initial.stripeLinks.paymentUrl} target="_blank" rel="noreferrer" className="text-amber-900 underline">
                Open PaymentIntent
              </a>
              <span className="ml-2 text-stone-400">{initial.stripePaymentIntentId}</span>
            </p>
          ) : (
            <p>PaymentIntent: {initial.stripePaymentIntentId ?? "—"}</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-950">Line items</h2>
        <ul className="mt-4 divide-y divide-stone-100 text-sm">
          {initial.items.map((it) => (
            <li key={it.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div>
                <Link
                  href={`/wear/${it.productSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-amber-900 hover:underline"
                >
                  {it.productNameSnapshot}
                </Link>
                {it.variantLabelSnapshot ? (
                  <p className="text-xs text-stone-500">Variant: {it.variantLabelSnapshot}</p>
                ) : null}
                {it.variantSku ? <p className="text-xs text-stone-400">SKU: {it.variantSku}</p> : null}
                <p className="text-xs text-stone-500">Qty {it.quantity}</p>
              </div>
              <p className="font-mono text-sm">{money(it.lineTotalCents, initial.currency)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-950">Fulfillment & tracking</h2>
        <p className="mt-1 text-xs text-stone-500">Save without changing status — useful before you mark shipped.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-stone-600">Fulfillment provider</label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. internal, Spreadconnect"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Tracking number</label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-mono"
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              placeholder="Carrier tracking"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-stone-600">External fulfillment reference</label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-mono"
              value={extRef}
              onChange={(e) => setExtRef(e.target.value)}
              placeholder="Provider job / order id"
            />
          </div>
        </div>
        <button type="button" className={cn(ui.buttonSecondary, "mt-4")} disabled={actionBusy} onClick={saveFulfillmentMeta}>
          Save fulfillment fields
        </button>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-950">Internal notes</h2>
        <textarea
          className="mt-3 min-h-[100px] w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ops notes — visible to hyperadmin only."
        />
        <div className="mt-2 flex items-center gap-3">
          <button type="button" className={ui.buttonSecondary} disabled={notesBusy} onClick={saveNotes}>
            Save notes
          </button>
          {notesMsg ? <span className="text-sm text-stone-600">{notesMsg}</span> : null}
        </div>
      </section>

      {initial.allowedNext.length > 0 ? (
        <section className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-5">
          <h2 className="text-sm font-semibold text-amber-950">Lifecycle actions</h2>
          <p className="mt-1 text-xs text-stone-600">
            Cancelled and refunded require confirmation and an audit reason (8+ characters). Manual “mark paid” is only
            for edge reconciliation — Stripe webhook normally sets paid.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {initial.allowedNext.map((next) => (
              <button
                key={next}
                type="button"
                className={cn(
                  ui.buttonSecondary,
                  "text-sm",
                  isDestructive(next) && "border-red-200 bg-red-50 text-red-950 hover:bg-red-100",
                )}
                onClick={() => {
                  setModalNext(next);
                  setReason("");
                  setConfirmDestructive(false);
                  setActionErr(null);
                }}
              >
                {ACTION_LABEL[next] ?? next}
              </button>
            ))}
          </div>
          {actionErr ? <p className="mt-3 text-sm text-red-700">{actionErr}</p> : null}
        </section>
      ) : (
        <p className="text-sm text-stone-600">This order is closed — no further status transitions.</p>
      )}

      <AnimatePresence>
        {modalNext ? (
          <motion.div
            key="wear-lifecycle-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wear-order-lifecycle-title"
            aria-describedby="wear-order-lifecycle-description"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={transition}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !actionBusy) {
                setModalNext(null);
                return;
              }
              if (e.key !== "Tab" || !modalRef.current) return;
              const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
              if (focusable.length === 0) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }}
          >
            <motion.div
              ref={modalRef}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition}
              onClick={(e) => e.stopPropagation()}
            >
            <h3 id="wear-order-lifecycle-title" className="text-lg font-semibold text-amber-950">
              {ACTION_LABEL[modalNext] ?? humanStatus(modalNext)}
            </h3>
            <p id="wear-order-lifecycle-description" className="mt-2 text-sm text-stone-600">
              Confirm the lifecycle transition and record any audit notes required for this change.
            </p>
            {needsReason(modalNext) ? (
              <div className="mt-4">
                <label className="text-xs font-medium text-stone-600">Reason (audit log, min. 8 characters)</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            ) : null}
            {modalNext === "shipped" ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-stone-500">Optional — values below are saved with this transition.</p>
                <input
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  placeholder="Tracking number"
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  placeholder="Provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                />
              </div>
            ) : null}
            {isDestructive(modalNext) ? (
              <label className="mt-4 flex items-center gap-2 text-sm text-stone-800">
                <input
                  type="checkbox"
                  checked={confirmDestructive}
                  onChange={(e) => setConfirmDestructive(e.target.checked)}
                />
                I understand this is a sensitive state change.
              </label>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" className={ui.buttonGhost} disabled={actionBusy} onClick={() => setModalNext(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={cn(ui.buttonSecondary, isDestructive(modalNext) && "bg-red-700 text-white hover:bg-red-800")}
                disabled={actionBusy}
                onClick={submitTransition}
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
