import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { listStudioInsightsPayload } from "@/lib/ai/ensure-studio-insights";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const insights = await listStudioInsightsPayload(prisma, studioId, { take: 48 });
  const visible = insights.slice(0, 6);

  return NextResponse.json({ insights: visible });
}
