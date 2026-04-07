import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bookingId = new URL(req.url).searchParams.get("bookingId");
  const logs = await prisma.calendarSyncLog.findMany({
    where: {
      connection: { studioId },
      ...(bookingId ? { bookingId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      bookingId: true,
      actionType: true,
      status: true,
      message: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ logs });
}
