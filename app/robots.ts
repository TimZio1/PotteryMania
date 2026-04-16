import { isPreregistrationOnly } from "@/lib/preregistration";
import { siteMetadata } from "@/lib/seo";

export default function robots() {
  const prereg = isPreregistrationOnly();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/unauthorized-admin"],
        disallow: prereg
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
