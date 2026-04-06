import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import WearOrdersAdminClient from "@/components/admin/wear-orders-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminWearOrdersPage() {
  const user = await requireHyperAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const orders = await prisma.wearOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      items: {
        include: {
          wearProduct: { select: { slug: true } },
        },
      },
    },
  });

  const initial = orders.map((o) => ({
    id: o.id,
    status: o.status,
    customerEmail: o.customerEmail,
    customerName: o.customerName,
    subtotalCents: o.subtotalCents,
    amountTotalCents: o.amountTotalCents,
    currency: o.currency,
    createdAt: o.createdAt.toISOString(),
    stripeCheckoutSessionId: o.stripeCheckoutSessionId,
    stripePaymentIntentId: o.stripePaymentIntentId,
    items: o.items.map((it) => ({
      id: it.id,
      productNameSnapshot: it.productNameSnapshot,
      variantLabelSnapshot: it.variantLabelSnapshot,
      quantity: it.quantity,
      unitPriceCents: it.unitPriceCents,
      lineTotalCents: it.unitPriceCents * it.quantity,
      productSlug: it.wearProduct.slug,
    })),
  }));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Commerce · Wear</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Wear orders</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Orders from the native wear checkout flow. Payment status follows Stripe webhook confirmation.
      </p>
      <WearOrdersAdminClient initial={initial} />
    </div>
  );
}
