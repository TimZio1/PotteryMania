import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const ADMIN_UNLOCK_ANALYSIS: Prisma.InputJsonValue = {
  diagnosis: "This insight was unlocked by platform staff at no charge.",
  benchmark: "—",
  recommendations: ["Review the preview metrics on your AI Advisor page and apply changes manually where appropriate."],
  projection: "—",
  confidenceNote: "Admin unlock — not generated from live benchmark data.",
};

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: { reason?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (reason.length < 8) {
    return NextResponse.json({ error: "reason required (at least 8 characters)" }, { status: 400 });
  }

  const insight = await prisma.generatedInsight.findUnique({
    where: { id },
    include: { purchase: true, studio: { select: { id: true, displayName: true } } },
  });
  if (!insight) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (insight.status === "purchased") {
    return NextResponse.json({ error: "Already unlocked" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.generatedInsight.update({
      where: { id },
      data: {
        status: "purchased",
        purchasedAt: new Date(),
        fullAnalysis: insight.fullAnalysis ?? ADMIN_UNLOCK_ANALYSIS,
      },
    });
    if (!insight.purchase) {
      await tx.insightPurchase.create({
        data: {
          insightId: id,
          studioId: insight.studioId,
          userId: user.id,
          amountCents: 0,
          stripePaymentIntentId: null,
        },
      });
    }
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "generated_insight.force_unlock",
    entityType: "generated_insight",
    entityId: id,
    before: { status: insight.status, studioId: insight.studioId },
    after: { status: "purchased", studioId: insight.studioId },
    reason,
  });

  return NextResponse.json({ ok: true, insightId: id });
}
