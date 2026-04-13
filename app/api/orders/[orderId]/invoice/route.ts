import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ensureOrderInvoice } from "@/lib/invoices/create";

type Ctx = { params: Promise<{ orderId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orderId } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerUserId: true,
      items: { select: { vendor: { select: { ownerUserId: true } } } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCustomer = order.customerUserId === user.id;
  const isOwner = order.items.some((item) => item.vendor.ownerUserId === user.id);
  const isAdmin = user.role === "admin" || user.role === "hyper_admin";
  if (!isCustomer && !isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const invoice = await ensureOrderInvoice(order.id);
  if (!invoice) return NextResponse.json({ error: "Could not generate invoice" }, { status: 500 });

  return NextResponse.json({ invoice });
}
