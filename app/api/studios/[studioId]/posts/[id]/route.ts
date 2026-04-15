import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { title?: string; slug?: string; content?: string; imageUrl?: string | null; isPublished?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    title?: string;
    slug?: string;
    content?: string;
    imageUrl?: string | null;
    isPublished?: boolean;
    publishedAt?: Date | null;
  } = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.slug === "string" && body.slug.trim()) data.slug = slugify(body.slug);
  if (typeof body.content === "string" && body.content.trim()) data.content = body.content.trim();
  if (typeof body.imageUrl === "string") data.imageUrl = body.imageUrl.trim() || null;
  if (body.imageUrl === null) data.imageUrl = null;
  if (typeof body.isPublished === "boolean") {
    data.isPublished = body.isPublished;
    data.publishedAt = body.isPublished ? new Date() : null;
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  const existing = await prisma.studioPost.findFirst({ where: { id, studioId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = await prisma.studioPost.update({ where: { id }, data });
  return NextResponse.json({ item: row });
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const existing = await prisma.studioPost.findFirst({ where: { id, studioId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.studioPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
