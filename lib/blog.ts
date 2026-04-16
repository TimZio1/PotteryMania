import { prisma } from "@/lib/db";
import { CORNERSTONE_BLOG_POSTS } from "@/lib/blog-content";
import { captureError } from "@/lib/monitoring";

export type BlogListItem = {
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  tags: string[];
  coverImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date;
  updatedAt: Date;
};

export type BlogPostDetail = BlogListItem & {
  body: string;
};

function fallbackPosts(): BlogPostDetail[] {
  return CORNERSTONE_BLOG_POSTS.map((post) => ({
    ...post,
    coverImage: post.coverImage ?? null,
    seoTitle: post.seoTitle ?? null,
    seoDescription: post.seoDescription ?? null,
    publishedAt: new Date(post.publishedAt),
    updatedAt: new Date(post.publishedAt),
  })).sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export async function listPublishedBlogPosts(): Promise<BlogListItem[]> {
  try {
    const rows = await prisma.blogPost.findMany({
      where: { isPublished: true, publishedAt: { not: null } },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
    if (rows.length > 0) {
      return rows.map((row) => ({
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        author: row.author,
        tags: row.tags,
        coverImage: row.coverImage,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        publishedAt: row.publishedAt ?? row.createdAt,
        updatedAt: row.updatedAt,
      }));
    }
  } catch (error) {
    captureError(error, { tag: "blog_list_fallback" });
  }
  return fallbackPosts();
}

export async function getPublishedBlogPost(slug: string): Promise<BlogPostDetail | null> {
  try {
    const row = await prisma.blogPost.findFirst({
      where: { slug, isPublished: true },
    });
    if (row) {
      return {
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        body: row.body,
        author: row.author,
        tags: row.tags,
        coverImage: row.coverImage,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        publishedAt: row.publishedAt ?? row.createdAt,
        updatedAt: row.updatedAt,
      };
    }
  } catch (error) {
    captureError(error, { tag: "blog_post_fallback", slug });
  }
  return fallbackPosts().find((post) => post.slug === slug) ?? null;
}

export async function listBlogStaticParams() {
  try {
    const rows = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      select: { slug: true },
      take: 100,
    });
    if (rows.length > 0) return rows.map((row) => ({ slug: row.slug }));
  } catch (error) {
    captureError(error, { tag: "blog_static_params_fallback" });
  }
  return CORNERSTONE_BLOG_POSTS.slice(0, 100).map((post) => ({ slug: post.slug }));
}

export async function listSitemapBlogPosts(): Promise<Array<{ slug: string; updatedAt: Date }>> {
  try {
    const rows = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, updatedAt: true, publishedAt: true, createdAt: true },
      take: 1000,
    });
    if (rows.length > 0) {
      return rows.map((row) => ({
        slug: row.slug,
        updatedAt: row.updatedAt ?? row.publishedAt ?? row.createdAt,
      }));
    }
  } catch (error) {
    captureError(error, { tag: "blog_sitemap_fallback" });
  }

  return CORNERSTONE_BLOG_POSTS.map((post) => ({
    slug: post.slug,
    updatedAt: new Date(post.publishedAt),
  }));
}
