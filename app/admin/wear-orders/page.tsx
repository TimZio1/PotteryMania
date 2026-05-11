import { redirect } from "next/navigation";
import type { Prisma, WearOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import WearOrdersAdminClient from "@/components/admin/wear-orders-admin-client";
import { wearOrderNeedsOpsAttention } from "@/lib/wear-order-lifecycle";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Wear orders",
  "/admin/wear-orders",
  "Wear fulfillment orders and lifecycle.",
);

export const dynamic = "force-dynamic";

const ALL_STATUSES: WearOrderStatus[] = [
  "pending",
  "paid",
  "manual_review",
  "in_production",
  "fulfilled",
  "shipped",
  "cancelled",
  "refunded",
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseStatus(s: string | undefined): WearOrderStatus | undefined {
  if (!s || s === "all") return undefined;
  return ALL_STATUSES.includes(s as WearOrderStatus) ? (s as WearOrderStatus) : undefined;
}

function firstFilled(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function jsonStringField(value: Prisma.JsonValue | null | undefined, key: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export default async function AdminWearOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }>;
}) {
  const user = await requireHyperAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const sp = await searchParams;
  const statusFilter = parseStatus(sp.status);
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const from = typeof sp.from === "string" && sp.from ? new Date(`${sp.from}T00:00:00.000Z`) : null;
  const to =
    typeof sp.to === "string" && sp.to ? new Date(`${sp.to}T23:59:59.999Z`) : null;

  const where: Prisma.WearOrderWhereInput = {};
  const andParts: Prisma.WearOrderWhereInput[] = [];
  if (statusFilter) where.status = statusFilter;
  if (from && !Number.isNaN(from.getTime()) && to && !Number.isNaN(to.getTime())) {
    andParts.push({ createdAt: { gte: from, lte: to } });
  } else {
    if (from && !Number.isNaN(from.getTime())) andParts.push({ createdAt: { gte: from } });
    if (to && !Number.isNaN(to.getTime())) andParts.push({ createdAt: { lte: to } });
  }
  if (qRaw) {
    const or: Prisma.WearOrderWhereInput[] = [
      { customerEmail: { contains: qRaw, mode: "insensitive" } },
      { customerName: { contains: qRaw, mode: "insensitive" } },
      { order: { is: { customerEmail: { contains: qRaw, mode: "insensitive" } } } },
      { order: { is: { customerName: { contains: qRaw, mode: "insensitive" } } } },
      { order: { is: { shippingRateQuotes: { some: { destinationCountry: { contains: qRaw, mode: "insensitive" } } } } } },
      { items: { some: { productNameSnapshot: { contains: qRaw, mode: "insensitive" } } } },
    ];
    if (UUID_RE.test(qRaw)) {
      or.push({ id: qRaw });
    }
    andParts.push({ OR: or });
  }
  if (andParts.length) where.AND = andParts;

  const loadOrders = () =>
    prisma.wearOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        items: {
          include: {
            wearProduct: { select: { slug: true } },
          },
        },
        order: {
          select: {
            customerEmail: true,
            customerName: true,
            shippingAddressJson: true,
            shippingRateQuotes: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { destinationCountry: true },
            },
          },
        },
      },
    });

  let orders: Awaited<ReturnType<typeof loadOrders>> = [];
  let summaryPending = 0;
  let summaryPaidPipeline = 0;
  let summaryFulfilledAwaitingShip = 0;
  let summaryClosed = 0;
  let ordersLoadError: string | null = null;

  try {
    const tuple = await Promise.all([
      loadOrders(),
      prisma.wearOrder.count({ where: { status: "pending" } }),
      prisma.wearOrder.count({
        where: { status: { in: ["paid", "manual_review", "in_production"] } },
      }),
      prisma.wearOrder.count({ where: { status: "fulfilled" } }),
      prisma.wearOrder.count({ where: { status: { in: ["cancelled", "refunded"] } } }),
    ]);
    orders = tuple[0];
    summaryPending = tuple[1];
    summaryPaidPipeline = tuple[2];
    summaryFulfilledAwaitingShip = tuple[3];
    summaryClosed = tuple[4];
  } catch (err) {
    ordersLoadError = err instanceof Error ? err.message : String(err);
    console.error("[admin/wear-orders] query failed", err);
  }

  const initial = orders.map((o) => {
    const orderShippingCountry = jsonStringField(o.order?.shippingAddressJson, "country");
    const latestQuoteCountry = o.order?.shippingRateQuotes[0]?.destinationCountry ?? null;

    return {
      id: o.id,
      status: o.status,
      customerEmail: firstFilled(o.customerEmail, o.order?.customerEmail),
      customerName: firstFilled(o.customerName, o.order?.customerName),
      customerCountry: firstFilled(orderShippingCountry, latestQuoteCountry) || null,
      subtotalCents: o.subtotalCents,
      amountTotalCents: o.amountTotalCents,
      currency: o.currency,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      trackingNumber: o.trackingNumber,
      needsAction: wearOrderNeedsOpsAttention(o.status),
      stripeCheckoutSessionId: o.stripeCheckoutSessionId,
      stripePaymentIntentId: o.stripePaymentIntentId,
      items: o.items.map((it) => ({
        id: it.id,
        productNameSnapshot: it.productNameSnapshot,
        variantLabelSnapshot: it.variantLabelSnapshot,
        quantity: it.quantity,
        unitPriceCents: it.unitPriceCents,
        lineTotalCents: it.unitPriceCents * it.quantity,
        productSlug: it.wearProduct?.slug ?? "",
      })),
    };
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--muted)">Commerce · Wear</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Wear orders</h1>
      <p className="mt-2 max-w-2xl text-sm text-(--muted)">
        Operational queue for native wear. Move orders through production and shipping; Stripe still confirms payment.
      </p>

      {ordersLoadError ? (
        <div className="mt-6 rounded-2xl border border-red-300 bg-red-50/90 px-4 py-3 text-sm text-red-950">
          <p className="font-semibold">Wear orders could not be loaded</p>
          <p className="mt-1 break-all font-mono text-xs">{ordersLoadError}</p>
          <p className="mt-2 text-xs text-red-900">
            Confirm <span className="font-mono">DATABASE_URL</span> and that wear order migrations are applied (
            <span className="font-mono">npx prisma migrate deploy</span>).
          </p>
        </div>
      ) : null}

      <WearOrdersAdminClient
        initial={initial}
        summary={{
          pending: summaryPending,
          paidPipeline: summaryPaidPipeline,
          fulfilledAwaitingShip: summaryFulfilledAwaitingShip,
          cancelledOrRefunded: summaryClosed,
        }}
        filter={{
          status: sp.status ?? "all",
          q: qRaw,
          from: sp.from ?? "",
          to: sp.to ?? "",
        }}
      />
    </div>
  );
}
