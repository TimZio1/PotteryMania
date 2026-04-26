import { isPreregistrationOnly } from "@/lib/preregistration";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";
import { siteMetadata } from "@/lib/seo";

export default function robots() {
  const prereg = isPreregistrationOnly();
  const apparel = isApparelOnlyLaunch();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/unauthorized-admin"],
        disallow: apparel
          ? [
              "/dashboard",
              "/admin",
              "/api",
              "/account",
              "/my-bookings",
              "/my-orders",
              "/my-packages",
              "/my-memberships",
              "/my-waitlist",
              "/my-loyalty",
              "/reviews/new",
              "/marketplace",
              "/classes",
              "/studios",
              "/category",
              "/gift-cards",
              "/blog",
              "/embed",
              "/pricing",
              "/demo",
              "/vision",
              "/early-access",
            ]
          : prereg
            ? ["/dashboard", "/admin", "/api", "/login", "/register", "/marketplace", "/classes", "/studios", "/cart"]
            : [
                "/dashboard",
                "/admin",
                "/api",
                "/cart",
                "/checkout",
                "/checkout/success",
                "/account",
                "/my-bookings",
                "/my-orders",
                "/my-packages",
                "/my-memberships",
                "/my-waitlist",
                "/my-loyalty",
                "/reviews/new",
              ],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/llms.txt", "/llms-full.txt", "/.well-known/ai-plugin.json"],
        disallow: ["/dashboard", "/admin", "/api", "/cart", "/checkout", "/account", "/my-"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/llms.txt", "/llms-full.txt", "/.well-known/ai-plugin.json"],
        disallow: ["/dashboard", "/admin", "/api", "/cart", "/checkout", "/account", "/my-"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/llms.txt", "/llms-full.txt", "/.well-known/ai-plugin.json"],
        disallow: ["/dashboard", "/admin", "/api", "/cart", "/checkout", "/account", "/my-"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/llms.txt", "/llms-full.txt", "/.well-known/ai-plugin.json"],
        disallow: ["/dashboard", "/admin", "/api", "/cart", "/checkout", "/account", "/my-"],
      },
    ],
    sitemap: `${siteMetadata.url}/sitemap.xml`,
  };
}
