import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  return NextResponse.json({
    orders: orders.map((o) => ({
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
    })),
  });
}
