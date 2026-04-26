/** Reserved or ambiguous paths — cannot be used as `/w/{code}`. */
const RESERVED = new Set(
  [
    "api",
    "admin",
    "login",
    "logout",
    "dashboard",
    "account",
    "cart",
    "checkout",
    "marketplace",
    "studios",
    "embed",
    "unauthorized",
    "terms",
    "privacy",
    "vision",
    "early-access",
    "demo",
    "wear",
    "w",
    "r",
    "s",
    "static",
    "_next",
    "favicon.ico",
    "robots.txt",
    "sitemap",
    "opengraph-image",
    "twitter-image",
  ].map((s) => s.toLowerCase()),
);

/**
 * Normalize user input to stored short code: lowercase [a-z0-9-], 3–32 chars.
 * Returns null if invalid.
 */
export function normalizeWearAffiliateCode(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const s = decodeURIComponent(String(raw).trim()).toLowerCase();
  if (!/^[a-z0-9-]{3,32}$/.test(s)) return null;
  if (s.startsWith("-") || s.endsWith("-") || s.includes("--")) return null;
  if (RESERVED.has(s)) return null;
  return s;
}
