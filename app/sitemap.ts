import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { isPreregistrationOnly } from "@/lib/preregistration";
import { captureError } from "@/lib/monitoring";
import { siteMetadata } from "@/lib/seo";
import { listSitemapBlogPosts } from "@/lib/blog";

const SITEMAP_LIMIT = 1000;

function entry(path: string, lastModified: Date, priority?: number, changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]) {
  return {
    url: new URL(path, siteMetadata.url).toString(),
    lastModified,
    ...(priority != null ? { priority } : {}),
    ...(changeFrequency ? { changeFrequency } : {}),
  };
}

/** Lets `next build` succeed when no DB is reachable (CI, fresh clone). */
function staticSitemapFallback(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = isPreregistrationOnly()
    ? ["/", "/pricing", "/terms", "/privacy", "/vendor-terms"]
    : [
        "/",
        "/pricing",
        "/demo",
        "/dashboard-demo",
        "/blog",
        "/marketplace",
        "/classes",
        "/studios",
        "/wear",
        "/wear/shop",
        "/gift-cards",
        "/login",
        "/register",
        "/terms",
        "/privacy",
        "/vendor-terms",
      ];
  return paths.map((path) => entry(path, now, path === "/" ? 1 : 0.6, path === "/" ? "daily" : "weekly"));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const now = new Date();

    if (isPreregistrationOnly()) {
      return [
        entry("/", now, 1, "daily"),
        entry("/pricing", now, 0.8, "weekly"),
        entry("/terms", now, 0.2, "monthly"),
        entry("/privacy", now, 0.2, "monthly"),
        entry("/vendor-terms", now, 0.2, "monthly"),
      ];
    }

    const [products, experiences, studios, categories, wearProducts, blogPosts] = await Promise.all([
      prisma.product.findMany({ where: { status: "active" }, select: { id: true, updatedAt: true }, take: SITEMAP_LIMIT }),
      prisma.experience.findMany({
        where: { status: "active", visibility: "public" },
        select: { id: true, updatedAt: true },
        take: SITEMAP_LIMIT,
      }),
      prisma.studio.findMany({
        where: { status: "approved" },
        select: { id: true, updatedAt: true },
        take: SITEMAP_LIMIT,
      }),
      prisma.productCategory.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        take: SITEMAP_LIMIT,
      }),
      prisma.wearProduct.findMany({
        where: { isActive: true, archivedAt: null },
        select: { slug: true, updatedAt: true },
        take: SITEMAP_LIMIT,
      }),
      listSitemapBlogPosts(),
    ]);

    return [
      entry("/", now, 1, "daily"),
      entry("/pricing", now, 0.9, "weekly"),
      entry("/demo", now, 0.7, "weekly"),
      entry("/dashboard-demo", now, 0.6, "weekly"),
      entry("/blog", now, 0.8, "weekly"),
      entry("/marketplace", now, 0.8, "daily"),
      entry("/classes", now, 0.9, "daily"),
      entry("/studios", now, 0.9, "daily"),
      entry("/wear", now, 0.7, "weekly"),
      entry("/wear/shop", now, 0.8, "daily"),
      entry("/gift-cards", now, 0.5, "weekly"),
      entry("/login", now, 0.3, "monthly"),
      entry("/register", now, 0.4, "monthly"),
      entry("/terms", now, 0.2, "monthly"),
      entry("/privacy", now, 0.2, "monthly"),
      entry("/vendor-terms", now, 0.2, "monthly"),
      ...categories.map((category) => entry(`/category/${category.slug}`, category.updatedAt, 0.7, "weekly")),
      ...products.map((product) => entry(`/marketplace/products/${product.id}`, product.updatedAt, 0.8, "weekly")),
      ...experiences.map((experience) => entry(`/classes/${experience.id}`, experience.updatedAt, 0.8, "weekly")),
      ...studios.flatMap((studio) => [
        entry(`/studios/${studio.id}`, studio.updatedAt, 0.8, "weekly"),
        entry(`/studios/${studio.id}/gallery`, studio.updatedAt, 0.6, "weekly"),
        entry(`/studios/${studio.id}/news`, studio.updatedAt, 0.6, "weekly"),
      ]),
      ...wearProducts.map((product) => entry(`/wear/${product.slug}`, product.updatedAt, 0.7, "weekly")),
      ...blogPosts.map((post) => entry(`/blog/${post.slug}`, post.updatedAt, 0.8, "weekly")),
    ];
  } catch (e) {
    captureError(e, { tag: "sitemap_db_fallback" });
    return staticSitemapFallback();
  }
}
