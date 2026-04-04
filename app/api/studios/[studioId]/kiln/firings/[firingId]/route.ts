import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import type { KilnFiringStatus } from "@prisma/client";

type Ctx = { params: Promise<{ studioId: string; firingId: string }> };

const STATUSES: KilnFiringStatus[] = ["draft", "loading", "firing", "cooling", "complete"];

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, firingId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const firing = await prisma.kilnFiring.findFirst({ where: { id: firingId, studioId } });
  if (!firing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { status?: string; label?: string; notes?: string; scheduledAt?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { status?: KilnFiringStatus; label?: string | null; notes?: string | null; scheduledAt?: Date | null } =
    {};
  if (typeof body.status === "string" && STATUSES.includes(body.status as KilnFiringStatus)) {
    data.status = body.status as KilnFiringStatus;
  }
  if (typeof body.label === "string") data.label = body.label.trim() || null;
  if (typeof body.notes === "string") data.notes = body.notes.trim() || null;
  if (body.scheduledAt === null) data.scheduledAt = null;
  else if (typeof body.scheduledAt === "string") {
    const d = new Date(body.scheduledAt);
    if (!Number.isNaN(d.getTime())) data.scheduledAt = d;
  }

  const updated = await prisma.kilnFiring.update({
    where: { id: firingId },
    data,
    include: { items: true },
  });
  return NextResponse.json({ firing: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, firingId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const firing = await prisma.kilnFiring.findFirst({ where: { id: firingId, studioId } });
  if (!firing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.kilnFiring.delete({ where: { id: firingId } });
  return NextResponse.json({ ok: true });
}
