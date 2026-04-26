import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  canonicalPublicOrigin,
  normalizeDomainName,
  primaryAppHostname,
  stripPortFromHost,
  vendorDomainResolveFetchBaseUrl,
} from "@/lib/vendor-domain-core";
import {
  hasSessionLikeCookie,
  isCsrfExemptPath,
  isSameOriginRequest,
  isStateChangingMethod,
} from "@/lib/csrf-protection";
import { resolveBackofficeSiteUrl, resolveFrontdeskSiteUrl } from "@/lib/public-site-url";
import { canBrowseDuringPreregistration, isPreregistrationOnly } from "@/lib/preregistration";
import {
  APPAREL_ONLY_PUBLIC_PATHS,
  APPAREL_ONLY_REDIRECT_PREFIXES,
  APPAREL_ONLY_REDIRECT_TO_SHOP_IF_AUTH_PATHS,
  APPAREL_ONLY_REDIRECT_TO_SHOP_PATHS,
  isApparelOnlyLaunch,
} from "@/lib/launch-mode";

const LOGIN_REQUIRED = [
  "/dashboard",
  "/admin",
  "/my-bookings",
  "/my-orders",
  "/my-memberships",
  "/my-loyalty",
  "/my-packages",
  "/my-waitlist",
  "/reviews/new",
  "/account",
];
/** Public core pages; legacy catalog entry URLs redirect separately. */
const BASE_PUBLIC_CORE = [
  "/",
  "/vision",
  "/early-access",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/checkout/success",
  "/unauthorized-admin",
];

function preregistrationGuestAllowlist(): string[] {
  if (isApparelOnlyLaunch()) return [...APPAREL_ONLY_PUBLIC_PATHS];
  // The launch homepage now defaults to apparel even when Railway misses
  // NEXT_PUBLIC_LAUNCH_MODE at build time, so the matching apparel routes must
  // stay public too. Otherwise landing-page CTAs to /wear/shop look broken by
  // redirecting straight back to /.
  return [...BASE_PUBLIC_CORE, ...APPAREL_ONLY_PUBLIC_PATHS];
}

function publicAllowlist(): string[] {
  if (isApparelOnlyLaunch()) {
    return [...APPAREL_ONLY_PUBLIC_PATHS];
  }
  if (isPreregistrationOnly()) return [...BASE_PUBLIC_CORE, ...APPAREL_ONLY_PUBLIC_PATHS];
  return [
    ...BASE_PUBLIC_CORE,
    "/classes",
    "/studios",
    "/gift-cards",
    "/category",
    "/marketplace",
    /** Partner short links: `/w/{code}` → wear shop + ref */
    "/w",
    "/wear",
    /**
     * `/cart` and `/checkout` are intentionally public: guests can review items,
     * adjust quantities, and see totals before being prompted to sign in.
     * The checkout API itself (`/api/checkout`) still enforces authentication
     * so no purchase completes without an account.
     */
    "/cart",
    "/checkout",
  ];
}

function apparelOnlyShouldRedirect(path: string): boolean {
  if (!isApparelOnlyLaunch()) return false;
  return matchesPath(path, [...APPAREL_ONLY_REDIRECT_PREFIXES]);
}

/**
 * Cookie names Auth.js may have set depending on version and scheme.
 * Clearing all variants prevents a stale session cookie from causing middleware to
 * keep redirecting to /api/auth/signout on every navigation.
 */
const AUTH_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "__Host-next-auth.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "__Host-authjs.session-token",
];

function clearAuthCookies(res: NextResponse): NextResponse {
  for (const name of AUTH_COOKIE_NAMES) {
    res.cookies.set({ name, value: "", path: "/", maxAge: 0 });
  }
  return res;
}

function matchesPath(path: string, candidates: string[]) {
  return candidates.some((p) => path === p || (p !== "/" && path.startsWith(`${p}/`)));
}

function hostFromOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return normalizeDomainName(new URL(origin).hostname);
  } catch {
    return null;
  }
}

export default auth(async (req) => {
  const path = req.nextUrl.pathname;
  const isApiPath = path.startsWith("/api/");

  /**
   * API paths must short-circuit BEFORE any redirect logic below.
   *
   * If a suspended user hits any page, we redirect to /api/auth/signout to
   * clear their session. That request then runs through middleware again — and
   * without this early return, the suspended check below would redirect
   * /api/auth/signout back to itself, causing ERR_TOO_MANY_REDIRECTS and a 429
   * from the hosting layer.
   */
  if (isApiPath) {
    if (isStateChangingMethod(req.method) && !isCsrfExemptPath(path)) {
      const cookieHeader = req.headers.get("cookie");
      if (hasSessionLikeCookie(cookieHeader)) {
        const origin = req.headers.get("origin");
        const referer = req.headers.get("referer");
        if (!isSameOriginRequest(origin, referer, req.nextUrl.origin)) {
          return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
        }
      }
    }
    return NextResponse.next();
  }

  const suspended = Boolean(req.auth?.user && (req.auth.user as { suspended?: boolean }).suspended);
  const userRole = (req.auth?.user as { role?: string } | undefined)?.role;

  if (!isApiPath && isApparelOnlyLaunch() && userRole !== "admin" && userRole !== "hyper_admin") {
    if (matchesPath(path, [...APPAREL_ONLY_REDIRECT_TO_SHOP_PATHS])) {
      return NextResponse.redirect(new URL("/wear/shop", req.url));
    }
    if (
      req.auth &&
      matchesPath(path, [...APPAREL_ONLY_REDIRECT_TO_SHOP_IF_AUTH_PATHS])
    ) {
      return NextResponse.redirect(new URL("/wear/shop", req.url));
    }
  }

  if (!isApiPath && apparelOnlyShouldRedirect(path)) {
    if (userRole !== "admin" && userRole !== "hyper_admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (req.auth && suspended) {
    /**
     * Clear the session cookies inline and send the user straight to /login,
     * rather than bouncing through /api/auth/signout. Eliminates one extra
     * hop and guarantees no loop even if the signout handler were to fail.
     */
    const dest = new URL("/login?reason=suspended", req.url);
    return clearAuthCookies(NextResponse.redirect(dest));
  }

  if (
    isPreregistrationOnly() &&
    !canBrowseDuringPreregistration(userRole) &&
    !matchesPath(path, preregistrationGuestAllowlist())
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const frontdeskOrigin = resolveFrontdeskSiteUrl();
  const backofficeOrigin = resolveBackofficeSiteUrl();
  const frontdeskHost = hostFromOrigin(frontdeskOrigin);
  const backofficeHost = hostFromOrigin(backofficeOrigin);
  const rawHost = req.headers.get("host");
  const hostNoPort = stripPortFromHost(rawHost);
  const currentHost = hostNoPort ? normalizeDomainName(hostNoPort) : null;

  // Hard split: frontdesk host should only serve customer-facing routes.
  if (
    currentHost &&
    frontdeskHost &&
    backofficeOrigin &&
    backofficeHost &&
    frontdeskHost !== backofficeHost &&
    currentHost === frontdeskHost &&
    !matchesPath(path, publicAllowlist()) &&
    !matchesPath(path, LOGIN_REQUIRED)
  ) {
    const dest = new URL(`${path}${req.nextUrl.search}`, backofficeOrigin);
    return NextResponse.redirect(dest);
  }

  /**
   * We no longer redirect the backoffice host (e.g. potterymania.com) to a separate
   * `FRONTDESK_SITE_URL` for `/`, /vision, /login, etc. That split sent users from
   * the primary app domain to the marketing domain and breaks single-domain setup.
   * Frontdesk → backoffice for non-marketing paths (block above) is unchanged.
   */

  const primaryHost = primaryAppHostname();
  if (hostNoPort && primaryHost) {
    const hNorm = normalizeDomainName(hostNoPort);
    const isKnownSplitHost = Boolean((frontdeskHost && hNorm === frontdeskHost) || (backofficeHost && hNorm === backofficeHost));
    if (hNorm && hNorm !== primaryHost && hNorm !== "localhost" && hNorm !== "127.0.0.1" && !isKnownSplitHost) {
      const base = vendorDomainResolveFetchBaseUrl();
      if (base) {
        try {
          const headers = new Headers();
          const secret = process.env.VENDOR_DOMAIN_RESOLVE_SECRET?.trim();
          if (secret) headers.set("x-potterymania-resolve-secret", secret);
          const resolveUrl = `${base}/api/vendor-domains/resolve?host=${encodeURIComponent(hNorm)}`;
          const res = await fetch(resolveUrl, { headers, cache: "no-store", signal: AbortSignal.timeout(2500) });
          if (res.ok) {
            const data = (await res.json()) as { studioId?: unknown };
            const studioId = typeof data.studioId === "string" ? data.studioId : null;
            if (studioId && !isApparelOnlyLaunch()) {
              const canon = canonicalPublicOrigin();
              const onStudioPage =
                path === `/studios/${studioId}` || path.startsWith(`/studios/${studioId}/`);
              if (path === "/" || path === "") {
                return NextResponse.rewrite(new URL(`/studios/${studioId}`, req.url));
              }
              if (onStudioPage) {
                return NextResponse.next();
              }
              if (canon) {
                const dest = new URL(`${path}${req.nextUrl.search}`, canon);
                return NextResponse.redirect(dest);
              }
            }
          }
        } catch {
          /* resolve unreachable — fall through */
        }
      }
    }
  }

  const impersonatorId = (req.auth?.user as { impersonatorId?: string } | undefined)?.impersonatorId;
  if (impersonatorId && (path === "/admin" || path.startsWith("/admin/"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  const allow = publicAllowlist();
  const isPublic = allow.some((p) => path === p || (p !== "/" && path.startsWith(p + "/")));
  const needsLogin = LOGIN_REQUIRED.some((p) => path === p || path.startsWith(p + "/"));

  if (needsLogin && !req.auth) {
    const u = new URL("/login", req.url);
    const callbackPath = `${path}${req.nextUrl.search}`;
    u.searchParams.set("callbackUrl", callbackPath);
    return NextResponse.redirect(u);
  }

  if (!isPublic && !needsLogin && !req.auth) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/ready|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\..*).*)"],
};