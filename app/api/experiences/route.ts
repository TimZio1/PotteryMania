import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const studioId = searchParams.get("studioId");
  const where = {
    status: "active" as const,
    visibility: "public" as const,
    studio: { status: "approved" as const },
    ...(studioId ? { studioId } : {}),
  };

  const experiences = await prisma.experience.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      studio: { select: { id: true, displayName: true, city: true, country: true } },
      images: { where: { isPrimary: true }, take: 1 },
      cancellationPolicy: true,
    },
  });

  return NextResponse.json({ experiences });
}