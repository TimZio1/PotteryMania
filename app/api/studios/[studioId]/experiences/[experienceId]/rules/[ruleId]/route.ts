import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string; experienceId: string; ruleId: string }> };

type Gate = null | { error: string } | { ok: true };

async function assertOwner(studioId: string, experienceId: string, userId: string): Promise<Gate> {
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== userId) return null;
  if (studio.status === "suspended") return { error: "Studio suspended" };
  const exp = await prisma.experience.findFirst({ where: { id: experienceId, studioId } });
  if (!exp) return null;
  return { ok: true };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, experienceId, ruleId } = await ctx.params;
  const gate = await assertOwner(studioId, experienceId, user.id);
  if (gate === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: 403 });

  const existing = await prisma.recurringRule.findFirst({
    where: { id: ruleId, experienceId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { isActive?: boolean } = {};
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const rule = await prisma.recurringRule.update({
    where: { id: ruleId },
    data,
  });
  return NextResponse.json({ rule });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, experienceId, ruleId } = await ctx.params;
  const gate = await assertOwner(studioId, experienceId, user.id);
  if (gate === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: 403 });

  const existing = await prisma.recurringRule.findFirst({
    where: { id: ruleId, experienceId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recurringRule.delete({ where: { id: ruleId } });
  return NextResponse.json({ ok: true });
}
