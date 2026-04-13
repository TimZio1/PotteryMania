import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function canManageStudio(studioId: string) {
  const user = await getSessionUser();
  if (!user) return false;
  const studio = await prisma.studio.findFirst({ where: { id: studioId, ownerUserId: user.id }, select: { id: true } });
  return Boolean(studio);
}

export async function GET(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const url = new URL(req.url);
  const includeDrafts = url.searchParams.get("includeDrafts") === "1";
  const items = await prisma.studioPost.findMany({
    where: { studioId, ...(includeDrafts ? {} : { isPublished: true }) },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  if (!(await canManageStudio(studioId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; slug?: string; content?: string; imageUrl?: string; isPublished?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const slug = slugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : title);
  if (!title || !content || !slug) return NextResponse.json({ error: "title, content required" }, { status: 400 });

  const row = await prisma.studioPost.create({
    data: {
      studioId,
      title,
      slug,
      content,
      imageUrl: typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null,
      isPublished: body.isPublished === true,
      publishedAt: body.isPublished === true ? new Date() : null,
    },
  });
  return NextResponse.json({ item: row }, { status: 201 });
}
