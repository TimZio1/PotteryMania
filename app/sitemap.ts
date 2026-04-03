import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { isPreregistrationOnly } from "@/lib/preregistration";
import { siteMetadata } from "@/lib/seo";

/** Lets `next build` succeed when no DB is reachable (CI, fresh clone). */
function staticSitemapFallback(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["/", "/early-access", "/login", "/register"].map((path) => ({
    url: new URL(path, siteMetadata.url).toString(),
    lastModified: now,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const base = siteMetadata.url.replace(/\/$/, "");
    const now = new Date();

    if (isPreregistrationOnly()) {
      return [
        { url: `${base}/`, lastModified: now },
        { url: `${base}/early-access`, lastModified: now },
        { url: `${base}/login`, lastModified: now },
        { url: `${base}/register`, lastModified: now },
      ];
    }

    const [products, experiences, studios] = await Promise.all([
      prisma.product.findMany({ where: { status: "active" }, select: { id: true, updatedAt: true }, take: 500 }),
      prisma.experience.findMany({
        where: { status: "active", visibility: "public" },
        select: { id: true, updatedAt: true },
        take: 500,
      }),
      prisma.studio.findMany({ where: { status: "approved" }, select: { id: true, updatedAt: true }, take: 500 }),
    ]);

    return [
      { url: `${base}/`, lastModified: now },
      { url: `${base}/early-access`, lastModified: now },
      { url: `${base}/marketplace`, lastModified: now },
      { url: `${base}/classes`, lastModified: now },
      { url: `${base}/studios`, lastModified: now },
      ...products.map((product) => ({
        url: `${base}/marketplace/products/${product.id}`,
        lastModified: product.updatedAt,
      })),
      ...experiences.map((experience) => ({
        url: `${base}/classes/${experience.id}`,
        lastModified: experience.updatedAt,
      })),
      ...studios.map((studio) => ({
        url: `${base}/studios/${studio.id}`,
        lastModified: studio.updatedAt,
      })),
    ];
  } catch (e) {
    console.warn("[sitemap] database unavailable, emitting static URLs only:", e);
    return staticSitemapFallback();
  }
}
