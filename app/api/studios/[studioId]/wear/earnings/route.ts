import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const paidOrders = await prisma.wearOrder.findMany({
    where: { studioId, status: { in: ["paid", "fulfilled", "shipped"] } },
    select: {
      id: true,
      subtotalCents: true,
      studioMarginCents: true,
      status: true,
      paidAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalOrders = paidOrders.length;
  const totalEarningsCents = paidOrders.reduce((sum, o) => sum + (o.studioMarginCents ?? 0), 0);
  const totalSalesCents = paidOrders.reduce((sum, o) => sum + o.subtotalCents, 0);

  return NextResponse.json({
    totalOrders,
    totalEarningsCents,
    totalSalesCents,
    orders: paidOrders.map((o) => ({
      id: o.id,
      subtotalCents: o.subtotalCents,
      earningsCents: o.studioMarginCents ?? 0,
      status: o.status,
      paidAt: o.paidAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
    })),
  });
}
