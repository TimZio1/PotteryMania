import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildAbsoluteUrl, siteMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    siteUrl: siteMetadata.url,
    sitemap: buildAbsoluteUrl("/sitemap.xml"),
    robots: buildAbsoluteUrl("/robots.txt"),
    llms: buildAbsoluteUrl("/llms.txt"),
    llmsFull: buildAbsoluteUrl("/llms-full.txt"),
    aiPlugin: buildAbsoluteUrl("/.well-known/ai-plugin.json"),
  };

  let ok = true;
  try {
    const [studios, experiences, products, blogPosts] = await Promise.all([
      prisma.studio.count({ where: { status: "approved" } }),
      prisma.experience.count({ where: { status: "active", visibility: "public" } }),
      prisma.product.count({ where: { status: "active" } }),
      prisma.blogPost.count({ where: { isPublished: true } }).catch(() => 0),
    ]);
    checks.content = { studios, experiences, products, blogPosts };
  } catch (error) {
    ok = false;
    checks.content = "error";
    checks.error = error instanceof Error ? error.message : "unknown";
  }

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
