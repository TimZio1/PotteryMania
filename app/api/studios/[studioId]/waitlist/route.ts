import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const slotId = searchParams.get("slotId") || undefined;

  const entries = await prisma.bookingWaitlistEntry.findMany({
    where: {
      studioId,
      ...(slotId ? { slotId } : {}),
      status: "active",
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      experience: { select: { id: true, title: true } },
      slot: { select: { id: true, slotDate: true, startTime: true, endTime: true, status: true } },
    },
  });

  return NextResponse.json({ entries });
}
