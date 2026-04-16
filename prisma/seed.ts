import { PrismaClient } from "@prisma/client";
import { CORNERSTONE_BLOG_POSTS } from "../lib/blog-content";

const prisma = new PrismaClient();

async function main() {
  for (const post of CORNERSTONE_BLOG_POSTS) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        author: post.author,
        tags: post.tags,
        coverImage: post.coverImage ?? null,
        seoTitle: post.seoTitle ?? null,
        seoDescription: post.seoDescription ?? null,
        isPublished: true,
        publishedAt: new Date(post.publishedAt),
      },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        author: post.author,
        tags: post.tags,
        coverImage: post.coverImage ?? null,
        seoTitle: post.seoTitle ?? null,
        seoDescription: post.seoDescription ?? null,
        isPublished: true,
        publishedAt: new Date(post.publishedAt),
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
