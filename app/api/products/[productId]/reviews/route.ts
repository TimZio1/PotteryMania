import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ productId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { productId } = await ctx.params;
  const reviews = await prisma.review.findMany({
    where: { productId, isVisible: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { email: true } },
    },
    take: 20,
  });
  const avg = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  return NextResponse.json({ reviews, avgRating: avg, count: reviews.length });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { productId } = await ctx.params;

  let body: { rating?: number; title?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const rating = typeof body.rating === "number" ? Math.max(1, Math.min(5, Math.floor(body.rating))) : 0;
  if (!rating) return NextResponse.json({ error: "Rating is required" }, { status: 400 });

  const verifiedOrderItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        customerUserId: user.id,
        paymentStatus: "paid",
      },
    },
    include: { product: true },
  });
  if (!verifiedOrderItem?.product) {
    return NextResponse.json({ error: "You can review this product only after purchase" }, { status: 403 });
  }

  const review = await prisma.review.create({
    data: {
      authorUserId: user.id,
      studioId: verifiedOrderItem.vendorId,
      productId,
      orderItemId: verifiedOrderItem.id,
      targetType: "product",
      rating,
      title: body.title?.trim() || null,
      body: body.body?.trim() || null,
    },
  });
  return NextResponse.json({ review }, { status: 201 });
}
