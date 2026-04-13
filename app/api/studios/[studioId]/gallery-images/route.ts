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

export async function GET(_: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const rows = await prisma.studioGalleryImage.findMany({
    where: { studioId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  if (!(await canManageStudio(studioId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { imageUrl?: string; caption?: string; sortOrder?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

  const row = await prisma.studioGalleryImage.create({
    data: {
      studioId,
      imageUrl,
      caption: typeof body.caption === "string" && body.caption.trim() ? body.caption.trim() : null,
      sortOrder: typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? Math.floor(body.sortOrder) : 0,
    },
  });
  return NextResponse.json({ item: row }, { status: 201 });
}
