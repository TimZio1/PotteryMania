import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

type Ctx = { params: Promise<{ id: string }> };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    title?: string;
    slug?: string;
    excerpt?: string;
    body?: string;
    author?: string;
    tags?: string[];
    coverImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    isPublished?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nextPublished = body.isPublished === undefined ? existing.isPublished : body.isPublished === true;
  const updated = await prisma.blogPost.update({
    where: { id },
    data: {
      ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
      ...(typeof body.excerpt === "string" ? { excerpt: body.excerpt.trim() } : {}),
      ...(typeof body.body === "string" ? { body: body.body.trim() } : {}),
      ...(typeof body.author === "string" ? { author: body.author.trim() || existing.author } : {}),
      ...(typeof body.slug === "string" || typeof body.title === "string"
        ? { slug: slugify((typeof body.slug === "string" ? body.slug : body.title) || existing.title) }
        : {}),
      ...(Array.isArray(body.tags)
        ? {
            tags: body.tags
              .filter((tag): tag is string => typeof tag === "string")
              .map((tag) => tag.trim())
              .filter(Boolean),
          }
        : {}),
      ...(body.coverImage !== undefined ? { coverImage: body.coverImage?.trim() || null } : {}),
      ...(body.seoTitle !== undefined ? { seoTitle: body.seoTitle?.trim() || null } : {}),
      ...(body.seoDescription !== undefined ? { seoDescription: body.seoDescription?.trim() || null } : {}),
      ...(body.isPublished !== undefined
        ? {
            isPublished: nextPublished,
            publishedAt: nextPublished ? existing.publishedAt ?? new Date() : null,
          }
        : {}),
    },
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "blog_post.update",
    entityType: "blog_post",
    entityId: updated.id,
    before: existing,
    after: updated,
    reason: "Updated blog post",
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.blogPost.delete({ where: { id } });
  await logAdminAction({
    actorUserId: user.id,
    action: "blog_post.delete",
    entityType: "blog_post",
    entityId: existing.id,
    before: existing,
    reason: "Deleted blog post",
  });

  return NextResponse.json({ ok: true });
}
