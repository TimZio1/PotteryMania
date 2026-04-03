/**
 * When "on", marketplace, classes directory, and studio directory are closed to the public:
 * guests → /early-access; signed-in customers → /. Vendors and admins may still browse (QA / operations).
 *
 * Override: PREREGISTRATION_ONLY=0 (or false/off) opens browsing for everyone.
 * Default: closed in production, open in development (set PREREGISTRATION_ONLY=1 locally to test).
 */
export function isPreregistrationOnly(): boolean {
  const v = process.env.PREREGISTRATION_ONLY?.toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  if (v === "1" || v === "true" || v === "on") return true;
  return process.env.NODE_ENV === "production";
}

/** URL prefixes that are hidden during preregistration (not admin). */
export const PREREGISTRATION_CLOSED_PREFIXES = ["/marketplace", "/classes", "/studios"] as const;

export function isPreregistrationClosedPath(pathname: string): boolean {
  return PREREGISTRATION_CLOSED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Roles that may open shop/classes/studio directory while preregistration is on. */
export function canBrowseDuringPreregistration(role: string | undefined): boolean {
  return role === "vendor" || role === "admin" || role === "hyper_admin";
}
