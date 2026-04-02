import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ productId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { productId } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      status: "active",
      studio: { status: "approved" },
    },
    include: {
      studio: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const related = await prisma.product.findMany({
    where: {
      studioId: product.studioId,
      status: "active",
      id: { not: product.id },
    },
    take: 4,
    include: { images: { where: { isPrimary: true }, take: 1 } },
  });

  return NextResponse.json({ product, related });
}