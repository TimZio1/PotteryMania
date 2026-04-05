import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth-session";
import { ADMIN_ORDER_STATUSES, findAdminOrdersForList } from "@/lib/admin-orders-query";
import { DataTable } from "@/components/admin/data-table";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function formatOrderMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "EUR",
  }).format(cents / 100);
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/unauthorized-admin");

  const sp = (await searchParams) ?? {};
  const studioId = typeof sp.studioId === "string" ? sp.studioId.trim() : "";
  const status = typeof sp.status === "string" ? sp.status.trim() : "";

  const orders = await findAdminOrdersForList({
    studioId: studioId || null,
    status: status || null,
    take: 100,
  });

  const qs = new URLSearchParams();
  if (studioId) qs.set("studioId", studioId);
  if (status) qs.set("status", status);
  const filterQs = qs.toString();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Commerce</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Orders</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Recent checkout orders across all studios. Filter by studio ID or order status; open a row for line items,
        payments, and addresses.
      </p>

      <form className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" method="get">
        <label className="min-w-[220px] flex-1">
          <span className={ui.label}>Studio ID (vendor)</span>
          <input
            name="studioId"
            className={`${ui.input} mt-1 font-mono text-xs`}
            defaultValue={studioId}
            placeholder="uuid"
          />
        </label>
        <label className="min-w-[160px]">
          <span className={ui.label}>Order status</span>
          <select name="status" className={`${ui.input} mt-1`} defaultValue={status}>
            <option value="">Any</option>
            {ADMIN_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={`${ui.buttonPrimary} sm:mb-0`}>
          Apply
        </button>
        {filterQs ? (
          <Link href="/admin/orders" className={`${ui.buttonSecondary} sm:mb-0`}>
            Clear
          </Link>
        ) : null}
      </form>

      <p className="mt-6 text-sm text-stone-500">
        Showing up to {orders.length} order{orders.length === 1 ? "" : "s"}
        {filterQs ? " (filtered)" : ""}.
      </p>

      <div className="mt-4">
        <DataTable
          rows={orders}
          empty="No orders match these filters."
          columns={[
            {
              key: "when",
              header: "Placed",
              cell: (o) => (
                <span className="text-xs text-stone-500">{o.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
              ),
            },
            {
              key: "customer",
              header: "Customer",
              cell: (o) => (
                <div>
                  <div className="font-medium text-stone-800">{o.customerEmail}</div>
                  {o.customerUserId ? (
                    <Link
                      href={`/admin/users/${o.customerUserId}`}
                      className="text-xs text-amber-900 underline-offset-2 hover:underline"
                    >
                      User record
                    </Link>
                  ) : (
                    <span className="text-xs text-stone-400">Guest</span>
                  )}
                </div>
              ),
            },
            {
              key: "vendors",
              header: "Studios",
              cell: (o) => {
                const names = [...new Map(o.items.map((i) => [i.vendorId, i.vendor.displayName])).values()];
                return <span className="text-xs text-stone-600">{names.join(" · ") || "—"}</span>;
              },
            },
            {
              key: "total",
              header: "Total",
              cell: (o) => <span className="font-medium tabular-nums">{formatOrderMoney(o.totalCents, o.currency)}</span>,
            },
            {
              key: "orderStatus",
              header: "Order",
              cell: (o) => <code className="text-xs">{o.orderStatus}</code>,
            },
            {
              key: "pay",
              header: "Payment",
              cell: (o) => <code className="text-xs">{o.paymentStatus}</code>,
            },
            {
              key: "fulfill",
              header: "Fulfillment",
              cell: (o) => <code className="text-xs">{o.fulfillmentStatus}</code>,
            },
            {
              key: "open",
              header: "",
              className: "w-24",
              cell: (o) => (
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline"
                >
                  View
                </Link>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
