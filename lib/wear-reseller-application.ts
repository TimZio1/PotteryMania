/**
 * Public env: external form (Typeform, HubSpot, etc.) or an internal path.
 * When unset or invalid, CTAs fall back to the built-in affiliate application.
 */
export const WEAR_RESELLER_DEFAULT_HREF = "/wear/partner/apply";

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
