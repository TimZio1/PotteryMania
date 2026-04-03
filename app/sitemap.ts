export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { siteMetadata } from "@/lib/seo";

export default async function sitemap() {
  const [products, experiences, studios] = await Promise.all([
    prisma.product.findMany({ where: { status: "active" }, select: { id: true, updatedAt: true }, take: 500 }),
    prisma.experience.findMany({ where: { status: "active", visibility: "public" }, select: { id: true, updatedAt: true }, take: 500 }),
    prisma.studio.findMany({ where: { status: "approved" }, select: { id: true, updatedAt: true }, take: 500 }),
  ]);

  return [
    "/",
    "/early-access",
    "/marketplace",
    "/classes",
    "/studios",
    ...products.map((product) => ({
      url: `${siteMetadata.url}/marketplace/products/${product.id}`,
      lastModified: product.updatedAt,
    })),
    ...experiences.map((experience) => ({
      url: `${siteMetadata.url}/classes/${experience.id}`,
      lastModified: experience.updatedAt,
    })),
    ...studios.map((studio) => ({
      url: `${siteMetadata.url}/studios/${studio.id}`,
      lastModified: studio.updatedAt,
    })),
  ];
}
