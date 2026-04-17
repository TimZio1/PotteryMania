import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Prisma, WearOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { allowedWearOrderTransitions, isWearOrderTerminal } from "@/lib/wear-order-lifecycle";
import WearOrderDetailClient from "@/components/admin/wear-order-detail-client";
import { metaAdminPage } from "@/lib/seo-routes";

export const dynamic = "force-dynamic";

type WearOrderAdminDetail = Prisma.WearOrderGetPayload<{
  include: {
    items: {
      include: {
        wearProduct: { select: { id: true; slug: true; name: true } };
        wearProductVariant: { select: { id: true; label: true; sku: true } };
      };
    };
  };
}>;

type OrderPageParams = { params: Promise<{ orderId: string }> };

export async function generateMetadata({ params }: OrderPageParams): Promise<Metadata> {
  const { orderId } = await params;
  return metaAdminPage("Wear order", `/admin/wear-orders/${orderId}`, "Inspect and transition a wear fulfillment order.");
}

export default async function AdminWearOrderDetailPage({ params }: OrderPageParams) {
  const user = await requireHyperAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const { orderId } = await params;

  let o: WearOrderAdminDetail | null;
  try {
    o = await prisma.wearOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            wearProduct: { select: { id: true, slug: true, name: true } },
            wearProductVariant: { select: { id: true, label: true, sku: true } },
          },
        },
      },
    });
  } catch (err) {
    console.error("[admin/wear-orders/detail] query failed", err);
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <div>
        <Link href="/admin/wear-orders" className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline">
          ← Wear orders
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Commerce · Wear</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">Order unavailable</h1>
        <div className="mt-6 rounded-2xl border border-red-300 bg-red-50/90 px-4 py-3 text-sm text-red-950">
          <p className="font-semibold">This order could not be loaded</p>
          <p className="mt-1 break-all font-mono text-xs">{msg}</p>
        </div>
      </div>
    );
  }
  if (!o) notFound();

  const allowedNext = isWearOrderTerminal(o.status)
    ? []
    : allowedWearOrderTransitions(o.status as WearOrderStatus);

  const stripeTest = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ?? true;
  const dashPrefix = stripeTest ? "/test" : "";
  const stripeBase = `https://dashboard.stripe.com${dashPrefix}`;
  const stripeLinks = {
    sessionUrl: o.stripeCheckoutSessionId
      ? `${stripeBase}/checkout/sessions/${o.stripeCheckoutSessionId}`
      : null,
    paymentUrl: o.stripePaymentIntentId ? `${stripeBase}/payments/${o.stripePaymentIntentId}` : null,
  };

  const payload = {
    id: o.id,
    status: o.status,
    customerEmail: o.customerEmail,
    customerName: o.customerName,
    subtotalCents: o.subtotalCents,
    amountTotalCents: o.amountTotalCents,
    currency: o.currency,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    paidAt: o.paidAt?.toISOString() ?? null,
    fulfilledAt: o.fulfilledAt?.toISOString() ?? null,
    shippedAt: o.shippedAt?.toISOString() ?? null,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
    refundedAt: o.refundedAt?.toISOString() ?? null,
    fulfillmentProvider: o.fulfillmentProvider,
    trackingNumber: o.trackingNumber,
    internalNotes: o.internalNotes,
    externalFulfillmentRef: o.externalFulfillmentRef,
    stripeCheckoutSessionId: o.stripeCheckoutSessionId,
    stripePaymentIntentId: o.stripePaymentIntentId,
    stripeLinks,
    allowedNext,
    items: o.items.map((it) => ({
      id: it.id,
      productNameSnapshot: it.productNameSnapshot,
      variantLabelSnapshot: it.variantLabelSnapshot,
      quantity: it.quantity,
      unitPriceCents: it.unitPriceCents,
      lineTotalCents: it.unitPriceCents * it.quantity,
      productSlug: it.wearProduct?.slug ?? "",
      variantSku: it.wearProductVariant?.sku ?? null,
    })),
  };

  return (
    <div>
      <Link href="/admin/wear-orders" className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline">
        ← Wear orders
      </Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Commerce · Wear</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">Order {o.id.slice(0, 8)}…</h1>
      <WearOrderDetailClient initial={payload} />
    </div>
  );
}
