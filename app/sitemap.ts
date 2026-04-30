import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { isPreregistrationOnly } from "@/lib/preregistration";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";
import { captureError } from "@/lib/monitoring";
import { siteMetadata } from "@/lib/seo";
import { listSitemapBlogPosts } from "@/lib/blog";
import { wearPublicProductWhere } from "@/lib/wear-public-filter";

const SITEMAP_LIMIT = 1000;

function entry(
  path: string,
  lastModified: Date,
  priority?: number,
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"],
) {
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
  if (isApparelOnlyLaunch()) {
    const paths = ["/", "/shop", "/about", "/wear/shop", "/wear/partner", "/wear/partner/apply", "/login", "/register", "/terms", "/privacy", "/refunds"];
    return paths.map((path) => entry(path, now, path === "/" ? 1 : 0.6, path === "/" ? "daily" : "weekly"));
  }
  const paths = isPreregistrationOnly()
    ? ["/", "/pricing", "/terms", "/privacy", "/vendor-terms"]
    : [
        "/",
        "/pricing",
        "/demo",
        "/dashboard-demo",
        "/blog",
        "/wear",
        "/wear/shop",
        "/wear/partner",
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

    if (isApparelOnlyLaunch()) {
      const wearProducts = await prisma.wearProduct.findMany({
        where: wearPublicProductWhere(),
        select: { slug: true, updatedAt: true },
        take: SITEMAP_LIMIT,
      });
      return [
        entry("/", now, 1, "daily"),
        entry("/shop", now, 0.95, "weekly"),
        entry("/about", now, 0.75, "monthly"),
        entry("/wear/shop", now, 0.95, "daily"),
        entry("/wear/partner", now, 0.8, "weekly"),
        entry("/wear/partner/apply", now, 0.65, "monthly"),
        entry("/login", now, 0.3, "monthly"),
        entry("/register", now, 0.4, "monthly"),
        entry("/terms", now, 0.2, "monthly"),
        entry("/privacy", now, 0.2, "monthly"),
        entry("/refunds", now, 0.25, "monthly"),
        ...wearProducts.map((product) => entry(`/wear/${product.slug}`, product.updatedAt, 0.7, "weekly")),
      ];
    }

    if (isPreregistrationOnly()) {
      return [
        entry("/", now, 1, "daily"),
        entry("/pricing", now, 0.8, "weekly"),
        entry("/terms", now, 0.2, "monthly"),
        entry("/privacy", now, 0.2, "monthly"),
        entry("/vendor-terms", now, 0.2, "monthly"),
      ];
    }

    const [wearProducts, blogPosts] = await Promise.all([
      prisma.wearProduct.findMany({
        where: wearPublicProductWhere(),
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
      entry("/wear", now, 0.7, "weekly"),
      entry("/wear/shop", now, 0.9, "daily"),
      entry("/wear/partner", now, 0.75, "weekly"),
      entry("/wear/partner/apply", now, 0.65, "monthly"),
      entry("/login", now, 0.3, "monthly"),
      entry("/register", now, 0.4, "monthly"),
      entry("/terms", now, 0.2, "monthly"),
      entry("/privacy", now, 0.2, "monthly"),
      entry("/vendor-terms", now, 0.2, "monthly"),
      ...wearProducts.map((product) => entry(`/wear/${product.slug}`, product.updatedAt, 0.7, "weekly")),
      ...blogPosts.map((post) => entry(`/blog/${post.slug}`, post.updatedAt, 0.8, "weekly")),
    ];
  } catch (e) {
    captureError(e, { tag: "sitemap_db_fallback" });
    return staticSitemapFallback();
  }
}
