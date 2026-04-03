import { siteMetadata } from "@/lib/seo";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/marketplace", "/classes", "/studios", "/early-access"],
      disallow: ["/dashboard", "/admin", "/api"],
    },
    sitemap: `${siteMetadata.url}/sitemap.xml`,
  };
}
