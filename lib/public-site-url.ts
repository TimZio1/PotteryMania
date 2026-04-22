function normalizeAbsoluteUrl(value: string | undefined | null) {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "");
  return `https://${raw.replace(/\/+$/, "")}`;
}

function platformFallbackUrl() {
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

/** Customer-facing canonical origin (shop/bookings/frontdesk). */
export function resolveFrontdeskSiteUrl() {
  return (
    normalizeAbsoluteUrl(process.env.FRONTDESK_SITE_URL) ||
    normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeAbsoluteUrl(process.env.AUTH_URL) ||
    normalizeAbsoluteUrl(process.env.NEXTAUTH_URL) ||
    platformFallbackUrl()
  );
}

/** Backoffice canonical origin (dashboard/admin/hyperadmin). */
export function resolveBackofficeSiteUrl() {
  return (
    normalizeAbsoluteUrl(process.env.BACKOFFICE_SITE_URL) ||
    normalizeAbsoluteUrl(process.env.AUTH_URL) ||
    normalizeAbsoluteUrl(process.env.NEXTAUTH_URL) ||
    normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    platformFallbackUrl()
  );
}

/** Backwards compatibility: public/customer origin defaults to frontdesk. */
export function resolvePublicSiteUrl() {
  return resolveFrontdeskSiteUrl();
}