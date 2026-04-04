import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

function assertOwner(studioId: string, ownerUserId: string, userId: string) {
  return ownerUserId === userId;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || !assertOwner(studioId, studio.ownerUserId, user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const firings = await prisma.kilnFiring.findMany({
    where: { studioId },
    orderBy: { createdAt: "desc" },
    include: { items: { orderBy: { createdAt: "asc" } } },
    take: 50,
  });
  return NextResponse.json({ firings });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || !assertOwner(studioId, studio.ownerUserId, user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { label?: string; notes?: string; scheduledAt?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const label = typeof body.label === "string" ? body.label.trim() || null : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  let scheduledAt: Date | null = null;
  if (body.scheduledAt) {
    const d = new Date(body.scheduledAt);
    if (!Number.isNaN(d.getTime())) scheduledAt = d;
  }

  const firing = await prisma.kilnFiring.create({
    data: {
      studioId,
      label,
      notes,
      scheduledAt,
      status: "draft",
    },
    include: { items: true },
  });
  return NextResponse.json({ firing });
}
