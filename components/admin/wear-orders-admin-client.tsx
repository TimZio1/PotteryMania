"use client";

import { Fragment, useState } from "react";
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

function money(cents: number, cur: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: cur.toUpperCase() }).format(cents / 100);
}

export default function WearOrdersAdminClient({ initial }: { initial: WearOrderAdminRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="mt-8 space-y-4">
      <p className="text-sm text-stone-600">
        Native wear checkout (platform Stripe). Totals include shipping once Stripe marks the session paid.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-stone-200/90 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50/80 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3">Paid total</th>
              <th className="px-4 py-3">Stripe</th>
              <th className="px-4 py-3"> </th>
            </tr>
          </thead>
          <tbody>
            {initial.map((o) => (
              <Fragment key={o.id}>
                <tr className="border-b border-stone-100">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-stone-600">
                    {o.createdAt.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-amber-950">{o.customerName}</div>
                    <div className="text-xs text-stone-500">{o.customerEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        o.status === "paid"
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900"
                          : "rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700"
                      }
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{money(o.subtotalCents, o.currency)}</td>
                  <td className="px-4 py-3 text-stone-700">
                    {o.amountTotalCents != null ? money(o.amountTotalCents, o.currency) : "—"}
                  </td>
                  <td className="max-w-[200px] px-4 py-3 font-mono text-[10px] text-stone-500 break-all">
                    {o.stripeCheckoutSessionId ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className={ui.buttonGhost + " min-h-9 px-3 text-xs"}
                      onClick={() => setOpen((x) => (x === o.id ? null : o.id))}
                    >
                      {open === o.id ? "Hide lines" : "Items"}
                    </button>
                  </td>
                </tr>
                {open === o.id ? (
                  <tr className="border-b border-stone-200 bg-stone-50/50">
                    <td colSpan={7} className="px-4 py-4">
                      <ul className="space-y-2 text-sm text-stone-700">
                        {o.items.map((it) => (
                          <li key={it.id} className="flex flex-wrap justify-between gap-2 border-b border-stone-100 pb-2 last:border-0">
                            <span>
                              {it.productNameSnapshot}
                              {it.variantLabelSnapshot ? (
                                <span className="text-stone-500"> · {it.variantLabelSnapshot}</span>
                              ) : null}{" "}
                              <span className="text-stone-500">×{it.quantity}</span>
                            </span>
                            <span className="font-mono text-xs">{money(it.lineTotalCents, o.currency)}</span>
                          </li>
                        ))}
                      </ul>
                      {o.stripePaymentIntentId ? (
                        <p className="mt-3 font-mono text-[10px] text-stone-500">
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
    </div>
  );
}
