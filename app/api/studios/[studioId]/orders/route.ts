import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== userId) return null;
  return studio;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: {
      items: { some: { vendorId: studioId, itemType: "product" } },
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        where: { vendorId: studioId },
        include: { product: true },
      },
      payments: true,
    },
    take: 100,
  });
  return NextResponse.json({ orders });
}
