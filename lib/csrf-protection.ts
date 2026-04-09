const EXEMPT_API_PREFIXES = ["/api/webhooks/", "/api/cron/"];
const EXEMPT_API_PATHS = ["/api/wear/events"];

const COOKIE_KEY_RE =
  /(?:^|;\s*)(?:pm_cart_id|authjs\.session-token|__Secure-authjs\.session-token|next-auth\.session-token|__Secure-next-auth\.session-token)=/;

export function isStateChangingMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

export function isCsrfExemptPath(pathname: string): boolean {
  return EXEMPT_API_PATHS.includes(pathname) || EXEMPT_API_PREFIXES.some((p) => pathname.startsWith(p));
}

export function hasSessionLikeCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return COOKIE_KEY_RE.test(cookieHeader);
}

function normalizeOrigin(input: string): string {
  try {
    const u = new URL(input);
    return u.origin.toLowerCase();
  } catch {
    return "";
  }
}

export function isSameOriginRequest(
  reqOrigin: string | null,
  reqReferer: string | null,
  expectedOrigin: string,
): boolean {
  const normalizedExpected = normalizeOrigin(expectedOrigin);
  if (!normalizedExpected) return false;
  const normalizedOrigin = normalizeOrigin(reqOrigin ?? "");
  if (normalizedOrigin && normalizedOrigin === normalizedExpected) return true;
  const normalizedReferer = normalizeOrigin(reqReferer ?? "");
  return Boolean(normalizedReferer && normalizedReferer === normalizedExpected);
}

