import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reviewId = typeof body.reviewId === "string" ? body.reviewId : "";
  if (!reviewId) return NextResponse.json({ error: "reviewId is required" }, { status: 400 });

  const existing = await prisma.review.findFirst({
    where: { id: reviewId, studioId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const data: { isVisible?: boolean; isFeatured?: boolean } = {};
  if ("isVisible" in body) data.isVisible = body.isVisible === true;
  if ("isFeatured" in body) data.isFeatured = body.isFeatured === true;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No moderation fields provided" }, { status: 400 });
  }

  const review = await prisma.review.update({
    where: { id: reviewId },
    data,
    select: {
      id: true,
      isVisible: true,
      isFeatured: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ review });
}

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const reviews = await prisma.review.findMany({
    where: { studioId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      author: { select: { id: true, email: true, customerProfile: { select: { fullName: true } } } },
      experience: { select: { id: true, title: true } },
      booking: { select: { id: true, slot: { select: { slotDate: true, startTime: true } } } },
    },
    take: 200,
  });

  return NextResponse.json({ reviews });
}
