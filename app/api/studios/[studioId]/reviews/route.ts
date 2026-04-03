import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const reviews = await prisma.review.findMany({
    where: { studioId, isVisible: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { email: true } },
      product: { select: { title: true } },
      experience: { select: { title: true } },
    },
    take: 30,
  });
  const avg = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  return NextResponse.json({ reviews, avgRating: avg, count: reviews.length });
}
