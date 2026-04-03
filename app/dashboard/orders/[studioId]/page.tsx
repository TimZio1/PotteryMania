"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type OrderRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  fulfillmentStatus: string;
  orderStatus: string;
  totalCents: number;
  shippingMethod?: string | null;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  items: { id: string; quantity: number; product?: { title: string } | null }[];
};

export default function StudioOrdersPage() {
  const { studioId } = useParams<{ studioId: string }>();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studioId}/orders`);
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || "Could not load orders");
      return;
    }
    setOrders(json.orders || []);
  }, [studioId]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateOrder(orderId: string, fulfillmentStatus: string) {
    const res = await fetch(`/api/studios/${studioId}/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fulfillmentStatus }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || "Could not update order");
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-amber-950">Orders</h1>
      <p className="mt-2 text-sm text-stone-600">Track product fulfillment from processing through delivery.</p>
      {err ? <p className={`${ui.errorText} mt-4`}>{err}</p> : null}

      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className={ui.card}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">{order.customerName}</h2>
                <p className="mt-1 text-sm text-stone-500">{order.customerEmail}</p>
                <p className="mt-2 text-sm text-stone-600">
                  Status: {order.orderStatus} · Fulfillment: {order.fulfillmentStatus}
                </p>
                <p className="mt-1 text-sm text-stone-600">Total €{(order.totalCents / 100).toFixed(2)}</p>
                {order.shippingMethod ? <p className="mt-1 text-sm text-stone-600">Shipping: {order.shippingMethod}</p> : null}
                <ul className="mt-3 list-disc pl-5 text-sm text-stone-600">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.product?.title || "Product"} × {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                {["processing", "shipped", "delivered"].map((status) => (
                  <button key={status} type="button" className={ui.buttonSecondary} onClick={() => updateOrder(order.id, status)}>
                    Mark {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
        {orders.length === 0 ? <p className="text-sm text-stone-500">No product orders yet.</p> : null}
      </div>
    </div>
  );
}
