import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string; insightId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { studioId, insightId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.generatedInsight.updateMany({
    where: {
      id: insightId,
      studioId,
      status: "generated",
    },
    data: { status: "viewed" },
  });

  return NextResponse.json({ ok: true });
}
