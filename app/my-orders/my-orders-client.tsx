"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SkeletonText } from "@/components/ui/skeleton";
import { platformUi } from "@/lib/ui-styles";
import { humanFulfillmentStatus, humanPaymentStatus } from "@/lib/status-labels";

type MyOrderItem = {
  id: string;
  quantity: number;
  priceSnapshotCents: number;
  title: string;
  imageUrl: string | null;
};

type MyOrder = {
  id: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totalCents: number;
  currency: string;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippingMethod: string | null;
  customerName: string;
  customerEmail: string;
  items: MyOrderItem[];
};

const statusTone: Record<string, string> = {
  paid: "text-emerald-400",
  pending: "text-amber-300",
  refunded: "text-red-300",
  cancelled: "text-red-300",
  delivered: "text-emerald-400",
  shipped: "text-amber-200",
};

export function MyOrdersClient() {
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/my-orders");
        const data = (await res.json()) as { error?: string; orders?: MyOrder[] };
        if (!res.ok) throw new Error(data.error ?? "We couldn’t load your orders. Try again.");
        if (!cancelled) setOrders(data.orders ?? []);
      } catch (error) {
        if (!cancelled) setErr(error instanceof Error ? error.message : "We couldn’t load your orders. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl py-10" role="status" aria-busy="true" aria-label="Loading orders">
        <div className={`${platformUi.card} space-y-4`}>
          <SkeletonText lines={1} className="max-w-xs" />
          <SkeletonText lines={5} />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className={`${platformUi.card} mx-auto max-w-3xl`}>
        <p className={platformUi.errorText}>{err}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <p className={platformUi.overline}>Orders</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">My orders</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Track your orders and grab receipts — every purchase, in one place.</p>
      </div>
      {orders.length === 0 ? (
        <div className={`${platformUi.cardMuted}`}>
          <p className="font-medium text-[var(--foreground)]">Nothing ordered yet</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Take a look around — your first order&rsquo;s only a click or two away.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/marketplace" className={platformUi.buttonSecondary}>Shop ceramics</Link>
            <Link href="/studios" className={platformUi.buttonSecondary}>Browse studios</Link>
          </div>
        </div>
      ) : (
        orders.map((order) => (
          <article key={order.id} className={platformUi.card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  Order #{order.id.slice(0, 8)} · {order.createdAt.slice(0, 10)}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                  {(order.totalCents / 100).toFixed(2)} {order.currency}
                </h2>
              </div>
              <div className="text-sm">
                <p className="text-[var(--muted)]">
                  Payment:{" "}
                  <span className={statusTone[order.paymentStatus] ?? "text-[var(--foreground)]"}>
                    {humanPaymentStatus(order.paymentStatus)}
                  </span>
                </p>
                <p className="text-[var(--muted)]">
                  Shipping:{" "}
                  <span className={statusTone[order.fulfillmentStatus] ?? "text-[var(--foreground)]"}>
                    {humanFulfillmentStatus(order.fulfillmentStatus)}
                  </span>
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.title} className="h-14 w-14 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-md border border-[var(--border)] text-xs text-[var(--muted)]">
                      No image
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--foreground)]">{item.title}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {item.quantity} × €{(item.priceSnapshotCents / 100).toFixed(2)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              {order.trackingUrl ? (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[var(--accent)] underline underline-offset-2"
                >
                  Track this order
                </a>
              ) : null}
              <Link href={`/api/orders/${order.id}/invoice`} className="font-medium text-[var(--accent)] underline underline-offset-2">
                Download receipt
              </Link>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
