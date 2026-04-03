import { isPreregistrationOnly } from "@/lib/preregistration";
import { siteMetadata } from "@/lib/seo";

export default function robots() {
  const prereg = isPreregistrationOnly();
  return {
    rules: {
      userAgent: "*",
      allow: prereg ? ["/", "/early-access", "/login", "/register"] : ["/", "/marketplace", "/classes", "/studios", "/early-access"],
      disallow: ["/dashboard", "/admin", "/api"],
    },
    sitemap: `${siteMetadata.url}/sitemap.xml`,
  };
}
