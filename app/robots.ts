import { isPreregistrationOnly } from "@/lib/preregistration";
import { siteMetadata } from "@/lib/seo";

export default function robots() {
  const prereg = isPreregistrationOnly();
  return {
    rules: {
      userAgent: "*",
      allow: prereg
        ? ["/", "/unauthorized-admin"]
        : ["/", "/unauthorized-admin"],
      disallow: prereg
        ? ["/dashboard", "/admin", "/api", "/login", "/register", "/marketplace", "/classes", "/studios", "/cart"]
        : ["/dashboard", "/admin", "/api", "/category"],
    },
    sitemap: `${siteMetadata.url}/sitemap.xml`,
  };
}
