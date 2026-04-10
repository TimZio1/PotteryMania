/**
 * When "on", legacy `/marketplace`, `/classes`, and `/studios` index experiences are treated as closed for guests.
 * When true, guests hitting `/` can be redirected to `/early-access` (currently unused; see `isPreregistrationOnly`).
 * Vendors and admins may still open / and browse directories (QA / operations).
 *
 * Override: PREREGISTRATION_ONLY=0 (or false/off) opens browsing for everyone and restores /register + public Sign in links.
 * Default: closed in production, open in development (set PREREGISTRATION_ONLY=1 locally to test).
 */
export function isPreregistrationOnly(): boolean {
  return false;
}

/** URL prefixes treated as closed for guests when restricted mode is on (not admin). */
export const PREREGISTRATION_CLOSED_PREFIXES = ["/marketplace", "/classes", "/studios"] as const;

export function isPreregistrationClosedPath(pathname: string): boolean {
  return PREREGISTRATION_CLOSED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Roles that may open legacy catalog indexes while restricted guest mode is on. */
export function canBrowseDuringPreregistration(role: string | undefined): boolean {
  return role === "vendor" || role === "admin" || role === "hyper_admin";
}
