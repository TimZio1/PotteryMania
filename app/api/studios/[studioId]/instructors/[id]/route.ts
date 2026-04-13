import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

async function canManageStudio(studioId: string) {
  const user = await getSessionUser();
  if (!user) return false;
  const studio = await prisma.studio.findFirst({ where: { id: studioId, ownerUserId: user.id }, select: { id: true } });
  return Boolean(studio);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  if (!(await canManageStudio(studioId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    name?: string;
    bio?: string | null;
    avatarUrl?: string | null;
    color?: string | null;
    isActive?: boolean;
    experienceIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    name?: string;
    bio?: string | null;
    avatarUrl?: string | null;
    color?: string | null;
    isActive?: boolean;
  } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.bio === "string") data.bio = body.bio.trim() || null;
  if (body.bio === null) data.bio = null;
  if (typeof body.avatarUrl === "string") data.avatarUrl = body.avatarUrl.trim() || null;
  if (body.avatarUrl === null) data.avatarUrl = null;
  if (typeof body.color === "string") data.color = body.color.trim() || null;
  if (body.color === null) data.color = null;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  const existing = await prisma.instructor.findFirst({ where: { id, studioId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const experienceIds = Array.isArray(body.experienceIds)
    ? body.experienceIds.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : null;
  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.instructor.update({ where: { id }, data });
    if (experienceIds) {
      await tx.instructorExperienceLink.deleteMany({ where: { instructorId: id } });
      if (experienceIds.length) {
        await tx.instructorExperienceLink.createMany({
          data: experienceIds.map((experienceId) => ({ instructorId: id, experienceId })),
        });
      }
    }
    return tx.instructor.findUnique({
      where: { id: updated.id },
      include: { experiences: { include: { experience: { select: { id: true, title: true } } } } },
    });
  });

  return NextResponse.json({ item: row });
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  if (!(await canManageStudio(studioId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.instructor.findFirst({ where: { id, studioId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.instructor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
