import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const before = await prisma.rankingBoost.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let reason = "";
  try {
    const j = (await req.json()) as { reason?: string };
    reason = typeof j.reason === "string" ? j.reason.trim() : "";
  } catch {
    /* optional empty */
  }
  if (reason.length < 8) {
    return NextResponse.json({ error: "reason required (min 8 chars) in JSON body" }, { status: 400 });
  }

  await prisma.rankingBoost.delete({ where: { id } });
  await logAdminAction({
    actorUserId: user.id,
    action: "ranking_boost.delete",
    entityType: "ranking_boost",
    entityId: id,
    before: {
      studioId: before.studioId,
      boostType: before.boostType,
      boostValue: before.boostValue,
    },
    reason,
  });

  return NextResponse.json({ ok: true });
}
