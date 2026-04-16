import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.blogPost.findMany({
    orderBy: [{ isPublished: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    title?: string;
    slug?: string;
    excerpt?: string;
    body?: string;
    author?: string;
    tags?: string[];
    coverImage?: string;
    seoTitle?: string;
    seoDescription?: string;
    isPublished?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
  const content = typeof body.body === "string" ? body.body.trim() : "";
  const author = typeof body.author === "string" && body.author.trim() ? body.author.trim() : "PotteryMania Editorial";
  const slug = slugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : title);
  if (!title || !excerpt || !content || !slug) {
    return NextResponse.json({ error: "title, excerpt, body, and slug are required" }, { status: 400 });
  }

  const row = await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt,
      body: content,
      author,
      tags: Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean) : [],
      coverImage: typeof body.coverImage === "string" && body.coverImage.trim() ? body.coverImage.trim() : null,
      seoTitle: typeof body.seoTitle === "string" && body.seoTitle.trim() ? body.seoTitle.trim() : null,
      seoDescription:
        typeof body.seoDescription === "string" && body.seoDescription.trim() ? body.seoDescription.trim() : null,
      isPublished: body.isPublished === true,
      publishedAt: body.isPublished === true ? new Date() : null,
    },
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "blog_post.create",
    entityType: "blog_post",
    entityId: row.id,
    after: row,
    reason: "Created blog post",
  });

  return NextResponse.json({ item: row }, { status: 201 });
}
