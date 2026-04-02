import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ experienceId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { experienceId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const fromQ = searchParams.get("from");
  const toQ = searchParams.get("to");

  const experience = await prisma.experience.findFirst({
    where: {
      id: experienceId,
      status: "active",
      visibility: "public",
      studio: { status: "approved" },
    },
    include: {
      studio: true,
      images: { orderBy: { sortOrder: "asc" } },
      cancellationPolicy: true,
    },
  });

  if (!experience) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const from = fromQ ? new Date(fromQ) : new Date();
  const to = toQ ? new Date(toQ) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  const slots = await prisma.bookingSlot.findMany({
    where: {
      experienceId,
      slotDate: { gte: from, lte: to },
      status: { in: ["open", "full"] },
    },
    orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ experience, slots });
}