import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth-session";
import { findAdminOrderById } from "@/lib/admin-orders-query";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function formatOrderMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "EUR",
  }).format(cents / 100);
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

export default async function AdminOrderDetailPage({ params }: Props) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/unauthorized-admin");

  const { id } = await params;
  const order = await findAdminOrderById(id);
  if (!order) notFound();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Commerce</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-amber-950">Order</h1>
          <p className="mt-1 font-mono text-xs text-stone-500">{order.id}</p>
        </div>
        <Link href="/admin/orders" className={ui.buttonSecondary}>
          ← All orders
        </Link>
      </div>

      <div className={`${ui.card} mt-8 space-y-4`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className={ui.label}>Placed</p>
            <p className="mt-1 text-sm text-stone-800">{order.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC</p>
          </div>
          <div>
            <p className={ui.label}>Total</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-amber-950">
              {formatOrderMoney(order.totalCents, order.currency)}
            </p>
          </div>
          <div>
            <p className={ui.label}>Order status</p>
            <p className="mt-1">
              <code className="text-sm">{order.orderStatus}</code>
            </p>
          </div>
          <div>
            <p className={ui.label}>Payment / fulfillment</p>
            <p className="mt-1 text-sm text-stone-700">
              <code>{order.paymentStatus}</code>
              <span className="text-stone-400"> · </span>
              <code>{order.fulfillmentStatus}</code>
            </p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
          <div>
            <p className={ui.label}>Customer</p>
            <p className="mt-1 text-sm font-medium text-stone-800">{order.customerName}</p>
            <p className="text-sm text-stone-600">{order.customerEmail}</p>
            {order.customerPhone ? <p className="text-sm text-stone-600">{order.customerPhone}</p> : null}
            {order.customerUser ? (
              <p className="mt-2">
                <Link href={`/admin/users/${order.customerUser.id}`} className="text-sm font-medium text-amber-900 hover:underline">
                  User: {order.customerUser.email}
                </Link>
              </p>
            ) : null}
          </div>
          <div>
            <p className={ui.label}>Stripe</p>
            {order.stripeCheckoutSessionId ? (
              <p className="mt-1 break-all font-mono text-xs text-stone-700">{order.stripeCheckoutSessionId}</p>
            ) : (
              <p className="mt-1 text-sm text-stone-500">—</p>
            )}
          </div>
        </div>

        {(order.trackingNumber || order.trackingCarrier) && (
          <div className="border-t border-stone-100 pt-4">
            <p className={ui.label}>Tracking</p>
            <p className="mt-1 text-sm text-stone-700">
              {[order.trackingCarrier, order.trackingNumber].filter(Boolean).join(" · ")}
              {order.trackingUrl ? (
                <>
                  {" "}
                  <a href={order.trackingUrl} className="text-amber-900 underline" target="_blank" rel="noreferrer">
                    Link
                  </a>
                </>
              ) : null}
            </p>
          </div>
        )}

        {order.notes ? (
          <div className="border-t border-stone-100 pt-4">
            <p className={ui.label}>Notes</p>
            <p className="mt-1 text-sm text-stone-700 whitespace-pre-wrap">{order.notes}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <JsonBlock value={order.shippingAddressJson} label="Shipping address" />
        <JsonBlock value={order.billingAddressJson} label="Billing address" />
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-amber-950">Line items</h2>
        <ul className="mt-4 space-y-3">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-stone-200 bg-white p-4 text-sm shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-stone-800">
                  {item.itemType === "product" ? item.product?.title ?? "Product" : "Booking"}
                </span>
                <span className="tabular-nums text-stone-700">{formatOrderMoney(item.priceSnapshotCents, order.currency)}</span>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {item.vendor.displayName} · qty {item.quantity}
                {item.participantCount != null ? ` · participants ${item.participantCount}` : ""}
              </p>
              <p className="mt-1 font-mono text-[11px] text-stone-400">{item.id}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-amber-950">Payments</h2>
        {order.payments.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No payment rows.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {order.payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm"
              >
                <span>
                  <code>{p.paymentStatus}</code>
                  <span className="text-stone-400"> · </span>
                  {p.provider}
                </span>
                <span className="tabular-nums font-medium">{formatOrderMoney(p.amountCents, p.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
