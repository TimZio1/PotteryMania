import { isPreregistrationOnly } from "@/lib/preregistration";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";
import { siteMetadata } from "@/lib/seo";

/**
 * Crawl policy:
 *   • Standard search bots — broad allow, exclude operator/checkout/account paths.
 *   • AI / LLM crawlers — explicit allow on public pages + llms.txt + ai-plugin.json.
 *     Same private-path disallow as standard bots.
 *   • Social share / link-preview bots (Facebook, X, LinkedIn, WhatsApp, Slack, Telegram) —
 *     explicit allow on public pages so OG/Twitter cards render in shares without surprises.
 */
const PRIVATE_DISALLOW_AI = ["/dashboard", "/admin", "/api", "/cart", "/checkout", "/account", "/my-"];
const SHARE_BOT_DISALLOW = ["/dashboard", "/admin", "/api", "/account", "/my-"];

const AI_BOT_USER_AGENTS = [
  // OpenAI
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  // Anthropic
  "Claude-Web",
  "ClaudeBot",
  "anthropic-ai",
  // Google AI (Bard / Gemini training & grounding)
  "Google-Extended",
  // Apple Intelligence training opt-in
  "Applebot-Extended",
  // Perplexity
  "PerplexityBot",
  // Meta AI
  "meta-externalagent",
  // Amazon
  "Amazonbot",
  // ByteDance
  "Bytespider",
  // Cohere
  "cohere-ai",
  // Diffbot (used by some LLM grounding pipelines)
  "Diffbot",
  // Common Crawl (data many models train from)
  "CCBot",
  // You.com
  "YouBot",
  // Mistral / Kagi
  "MistralAI-User",
  "KagiBot",
] as const;

const SHARE_BOT_USER_AGENTS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "Slackbot-LinkExpanding",
  "WhatsApp",
  "TelegramBot",
  "Pinterestbot",
  "Discordbot",
  "Applebot",
] as const;

export default function robots() {
  const prereg = isPreregistrationOnly();
  const apparel = isApparelOnlyLaunch();

  const baseDisallow = apparel
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
        ];

  const aiAllow = ["/", "/llms.txt", "/llms-full.txt", "/.well-known/ai-plugin.json"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/unauthorized-admin"],
        disallow: baseDisallow,
      },
      ...AI_BOT_USER_AGENTS.map((ua) => ({
        userAgent: ua,
        allow: aiAllow,
        disallow: PRIVATE_DISALLOW_AI,
      })),
      ...SHARE_BOT_USER_AGENTS.map((ua) => ({
        userAgent: ua,
        allow: ["/"],
        disallow: SHARE_BOT_DISALLOW,
      })),
    ],
    sitemap: `${siteMetadata.url}/sitemap.xml`,
    host: siteMetadata.url,
  };
}
