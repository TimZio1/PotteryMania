import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

async function canManageStudio(studioId: string) {
  const user = await getSessionUser();
  if (!user) return false;
  const studio = await prisma.studio.findFirst({ where: { id: studioId, ownerUserId: user.id }, select: { id: true } });
  return Boolean(studio);
}

export async function GET(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const includeInactive = new URL(req.url).searchParams.get("includeInactive") === "1";
  const items = await prisma.instructor.findMany({
    where: { studioId, ...(includeInactive ? {} : { isActive: true }) },
    include: {
      experiences: {
        include: { experience: { select: { id: true, title: true } } },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  if (!(await canManageStudio(studioId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; bio?: string; avatarUrl?: string; color?: string; experienceIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const experienceIds = Array.isArray(body.experienceIds)
    ? body.experienceIds.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  const row = await prisma.instructor.create({
    data: {
      studioId,
      name,
      bio: typeof body.bio === "string" && body.bio.trim() ? body.bio.trim() : null,
      avatarUrl: typeof body.avatarUrl === "string" && body.avatarUrl.trim() ? body.avatarUrl.trim() : null,
      color: typeof body.color === "string" && body.color.trim() ? body.color.trim() : null,
      experiences: experienceIds.length
        ? { create: experienceIds.map((experienceId) => ({ experienceId })) }
        : undefined,
    },
    include: { experiences: { include: { experience: { select: { id: true, title: true } } } } },
  });
  return NextResponse.json({ item: row }, { status: 201 });
}
