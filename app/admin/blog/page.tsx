import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { BlogPostsClient } from "@/components/admin/blog-posts-client";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage("Blog", "/admin/blog", "Manage PotteryMania editorial blog posts.");
export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const user = await requireHyperAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const posts = await prisma.blogPost.findMany({
    orderBy: [{ isPublished: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Editorial</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Blog</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Publish high-intent content for pottery studios, ceramic artists, ecommerce, bookings, and discovery.
        </p>
      </div>
      <BlogPostsClient initialPosts={posts} />
    </div>
  );
}
