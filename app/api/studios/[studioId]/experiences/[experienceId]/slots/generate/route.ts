import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { generateSlotsForRule } from "@/lib/scheduling/generate-slots";

type Ctx = { params: Promise<{ studioId: string; experienceId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, experienceId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  const exp = await prisma.experience.findFirst({ where: { id: experienceId, studioId } });
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { from?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const from = body.from ? new Date(body.from) : null;
  const to = body.to ? new Date(body.to) : null;
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "from and to ISO dates required" }, { status: 400 });
  }

  const rules = await prisma.recurringRule.findMany({
    where: { experienceId, isActive: true },
  });

  let created = 0;
  for (const rule of rules) {
    created += await generateSlotsForRule(rule, exp, { from, to });
  }

  return NextResponse.json({ created });
}