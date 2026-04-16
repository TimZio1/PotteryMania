function normalizeAbsoluteUrl(value: string | undefined | null) {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "");
  return `https://${raw.replace(/\/+$/, "")}`;
}

export function resolvePublicSiteUrl() {
  const explicit =
    normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeAbsoluteUrl(process.env.AUTH_URL) ||
    normalizeAbsoluteUrl(process.env.NEXTAUTH_URL);
  if (explicit) return explicit;

  const platformHost =
    process.env.RAILWAY_PUBLIC_DOMAIN?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    process.env.URL?.trim() ||
    "";
  if (platformHost) {
    return normalizeAbsoluteUrl(platformHost) as string;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://potterymania.com";
  }

  return "http://localhost:3000";
}
