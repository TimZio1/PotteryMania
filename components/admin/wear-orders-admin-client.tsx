"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui-styles";

export type WearOrderAdminRow = {
  id: string;
  status: string;
  customerEmail: string;
  customerName: string;
  subtotalCents: number;
  amountTotalCents: number | null;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  trackingNumber: string | null;
  needsAction: boolean;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  items: {
    id: string;
    productNameSnapshot: string;
    variantLabelSnapshot: string | null;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    productSlug: string;
  }[];
};

export type WearOrdersSummary = {
  pending: number;
  paidPipeline: number;
  fulfilledAwaitingShip: number;
  cancelledOrRefunded: number;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending payment" },
  { value: "paid", label: "Paid" },
  { value: "manual_review", label: "Manual review" },
  { value: "in_production", label: "In production" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "shipped", label: "Shipped" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
] as const;

function money(cents: number, cur: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: cur.toUpperCase() }).format(cents / 100);
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-950";
    case "paid":
      return "bg-emerald-100 text-emerald-900";
    case "manual_review":
      return "bg-orange-100 text-orange-950";
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

type Props = {
  initial: WearOrderAdminRow[];
  summary: WearOrdersSummary;
  filter: { status: string; q: string; from: string; to: string };
};

export default function WearOrdersAdminClient({ initial, summary, filter }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="mt-8 space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">New · awaiting payment</p>
          <p className="mt-2 text-3xl font-semibold text-amber-950">{summary.pending}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Paid · prep / production</p>
          <p className="mt-2 text-3xl font-semibold text-amber-950">{summary.paidPipeline}</p>
        </div>
        <div className="rounded-2xl border border-violet-200/80 bg-violet-50/40 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-900">Fulfilled · needs ship</p>
          <p className="mt-2 text-3xl font-semibold text-violet-950">{summary.fulfilledAwaitingShip}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Cancelled / refunded</p>
          <p className="mt-2 text-3xl font-semibold text-stone-800">{summary.cancelledOrRefunded}</p>
        </div>
      </section>

      <form
        method="get"
        action="/admin/wear-orders"
        className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end"
      >
        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-stone-600">Status</label>
          <select
            name="status"
            defaultValue={filter.status || "all"}
            className="mt-1 block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="text-xs font-medium text-stone-600">Search</label>
          <input
            type="search"
            name="q"
            placeholder="Email, name, product, order ID…"
            defaultValue={filter.q}
            className="mt-1 block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-600">From</label>
          <input
            type="date"
            name="from"
            defaultValue={filter.from}
            className="mt-1 block rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-600">To</label>
          <input
            type="date"
            name="to"
            defaultValue={filter.to}
            className="mt-1 block rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className={ui.buttonSecondary}>
            Apply filters
          </button>
          <Link href="/admin/wear-orders" className={cn(ui.buttonGhost, "inline-flex items-center")}>
            Reset
          </Link>
        </div>
      </form>

      <p className="text-sm text-[var(--muted)]">
        Showing {initial.length} order{initial.length === 1 ? "" : "s"} (newest first, max 500). Open a row for line
        items and lifecycle actions.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-stone-200/90 bg-white text-stone-800">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50/80 text-xs font-semibold uppercase tracking-wide text-stone-600">
            <tr>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Triage</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3">Paid total</th>
              <th className="px-4 py-3"> </th>
            </tr>
          </thead>
          <tbody>
            {initial.map((o) => (
              <Fragment key={o.id}>
                <tr
                  className={cn(
                    "border-b border-stone-100",
                    o.needsAction ? "bg-amber-50/30" : "",
                  )}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-stone-500">
                    {o.createdAt.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3">
                    {o.customerEmail.trim() || o.customerName.trim() ? (
                      <>
                        <div className="font-medium text-stone-900">{o.customerName.trim() || "—"}</div>
                        <div className="text-xs text-stone-600">{o.customerEmail.trim() || "—"}</div>
                      </>
                    ) : (
                      <div className="space-y-1 text-xs text-stone-500">
                        <p className="font-medium text-stone-700">Not in database yet</p>
                        <p className="leading-snug">
                          {o.status === "pending"
                            ? "Buyer hasn’t finished Stripe Checkout, or email is only on the session."
                            : "Paid orders should show email after the fix; open Stripe for this session if it’s still blank."}
                        </p>
                        {o.stripeCheckoutSessionId ? (
                          <a
                            href={`https://dashboard.stripe.com/checkout/sessions/${encodeURIComponent(o.stripeCheckoutSessionId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex font-mono text-[11px] font-medium text-amber-900 underline underline-offset-2 hover:text-amber-800"
                          >
                            Session {o.stripeCheckoutSessionId.slice(0, 14)}…
                          </a>
                        ) : (
                          <span className="font-mono text-[11px] text-stone-400">No Stripe session id</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        statusBadgeClass(o.status),
                      )}
                    >
                      {humanStatus(o.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {o.needsAction ? (
                      <span className="font-semibold text-amber-900">Needs action</span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-900">{money(o.subtotalCents, o.currency)}</td>
                  <td className="px-4 py-3 text-stone-900">
                    {o.amountTotalCents != null ? money(o.amountTotalCents, o.currency) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/wear-orders/${o.id}`}
                        className={cn(ui.buttonSecondary, "min-h-9 px-3 text-xs")}
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        className={cn(ui.buttonGhost, "min-h-9 px-3 text-xs")}
                        onClick={() => setOpen((x) => (x === o.id ? null : o.id))}
                      >
                        {open === o.id ? "Hide lines" : "Items"}
                      </button>
                    </div>
                  </td>
                </tr>
                {open === o.id ? (
                  <tr className="border-b border-stone-200 bg-stone-50/50">
                    <td colSpan={7} className="px-4 py-4">
                      <ul className="space-y-2 text-sm text-stone-800">
                        {o.items.map((it) => (
                          <li
                            key={it.id}
                            className="flex flex-wrap justify-between gap-2 border-b border-stone-100 pb-2 last:border-0"
                          >
                            <span>
                              {it.productNameSnapshot}
                              {it.variantLabelSnapshot ? (
                                <span className="text-stone-600"> · {it.variantLabelSnapshot}</span>
                              ) : null}{" "}
                              <span className="text-stone-600">×{it.quantity}</span>
                            </span>
                            <span className="font-mono text-xs">{money(it.lineTotalCents, o.currency)}</span>
                          </li>
                        ))}
                      </ul>
                      {o.trackingNumber ? (
                        <p className="mt-2 text-xs text-stone-600">
                          Tracking: <span className="font-mono">{o.trackingNumber}</span>
                        </p>
                      ) : null}
                      {o.stripePaymentIntentId ? (
                        <p className="mt-2 font-mono text-[10px] text-stone-500">
                          PaymentIntent: {o.stripePaymentIntentId}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {initial.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-8 text-center text-sm text-stone-600">
          No orders match these filters.{" "}
          <button type="button" className="font-medium text-amber-900 underline" onClick={() => router.push("/admin/wear-orders")}>
            Clear filters
          </button>
        </p>
      ) : null}
    </div>
  );
}
