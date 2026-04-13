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

  let body: { imageUrl?: string; caption?: string | null; sortOrder?: number; isActive?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    imageUrl?: string;
    caption?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  } = {};
  if (typeof body.imageUrl === "string" && body.imageUrl.trim()) data.imageUrl = body.imageUrl.trim();
  if (typeof body.caption === "string") data.caption = body.caption.trim() || null;
  if (body.caption === null) data.caption = null;
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) data.sortOrder = Math.floor(body.sortOrder);
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  const existing = await prisma.studioGalleryImage.findFirst({ where: { id, studioId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = await prisma.studioGalleryImage.update({
    where: { id },
    data,
  });
  return NextResponse.json({ item: row });
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  if (!(await canManageStudio(studioId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.studioGalleryImage.findFirst({ where: { id, studioId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.studioGalleryImage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
