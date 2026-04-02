import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const studioId = searchParams.get("studioId");
  const status = searchParams.get("status");
  const where: Prisma.OrderWhereInput = {};
  if (studioId) where.items = { some: { vendorId: studioId } };
  if (status) where.orderStatus = status as Prisma.OrderWhereInput["orderStatus"];

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      items: { include: { vendor: { select: { displayName: true } } } },
      payments: true,
    },
  });
  return NextResponse.json({ orders });
}