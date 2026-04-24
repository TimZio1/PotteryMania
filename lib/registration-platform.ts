import { normalizeDomainName, stripPortFromHost } from "@/lib/vendor-domain-core";

/** Host label when the request is the OAuth callback (no original frontdesk Host). */
export function oauthGoogleRegistrationPlatformLabel(): string {
  const raw =
    process.env.FRONTDESK_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "";
  if (!raw) return "Google sign-in";
  try {
    const host = new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname;
    return host || "Google sign-in";
  } catch {
    return "Google sign-in";
  }
}

/** Public hostname for inbound registration / lead requests (clayense vs potterymania, etc.). */
export function registrationPlatformLabelFromRequest(req: Request): string {
  const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const host = normalizeDomainName(stripPortFromHost(hostHeader) || "");
  if (!host) return "unknown host";
  if (host === "clayense.com" || host.endsWith(".clayense.com")) return "clayense.com";
  if (host === "potterymania.com" || host.endsWith(".potterymania.com")) return "potterymania.com";
  return host;
}
