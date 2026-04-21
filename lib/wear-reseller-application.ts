/**
 * Public env: external form (Typeform, HubSpot, etc.) or an internal path like `/early-access`.
 * When unset or invalid, CTAs fall back to sign-up with shop setup.
 */
export const WEAR_RESELLER_DEFAULT_HREF =
  "/register?callbackUrl=" + encodeURIComponent("/dashboard/studio/new?setup=shop");

export function resolveWearResellerApplicationHref(
  fallback: string = WEAR_RESELLER_DEFAULT_HREF,
): string {
  const raw = process.env.NEXT_PUBLIC_WEAR_RESELLER_APPLICATION_URL?.trim();
  if (!raw) {
    return fallback;
  }

  if (raw.startsWith("/")) {
    if (raw.startsWith("//")) {
      return fallback;
    }
    return raw;
  }

  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return raw;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function isWearResellerApplicationExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
