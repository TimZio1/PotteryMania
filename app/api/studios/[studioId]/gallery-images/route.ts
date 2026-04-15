import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

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
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
