import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const limitRaw = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.floor(limitRaw))) : 20;

  const reviews = await prisma.review.findMany({
    where: { studioId, isVisible: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      createdAt: true,
      experience: { select: { id: true, title: true } },
      author: { select: { customerProfile: { select: { fullName: true } } } },
    },
  });

  const aggregate = await prisma.review.aggregate({
    where: { studioId, isVisible: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return NextResponse.json({
    reviews,
    averageRating: aggregate._avg.rating ?? 0,
    count: aggregate._count._all,
  });
}
