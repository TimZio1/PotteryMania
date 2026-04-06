import { NextResponse } from "next/server";
import type { InsightActionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string; insightId: string }> };

const ALLOWED: InsightActionType[] = ["applied", "deferred", "viewed_editor"];

export async function POST(req: Request, ctx: Ctx) {
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

  let body: { actionType?: string; metadata?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const actionType = body.actionType as InsightActionType | undefined;
  if (!actionType || !ALLOWED.includes(actionType)) {
    return NextResponse.json({ error: "Invalid actionType" }, { status: 400 });
  }

  const insight = await prisma.generatedInsight.findFirst({
    where: { id: insightId, studioId, status: "purchased" },
  });
  if (!insight) {
    return NextResponse.json({ error: "Insight not unlocked" }, { status: 400 });
  }

  await prisma.insightActionLog.create({
    data: {
      insightId,
      studioId,
      actionType,
      metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ ok: true });
}
