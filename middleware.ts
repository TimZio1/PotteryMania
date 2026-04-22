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
  "/pricing",
  "/demo",
  "/dashboard-demo",
  "/early-access",
  "/blog",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/refunds",
  "/vendor-terms",
  "/checkout/success",
  "/unauthorized-admin",
];

function publicAllowlist(): string[] {
  return [
    ...BASE_PUBLIC_CORE,
    "/register",
    "/classes",
    "/studios",
    "/gift-cards",
    "/category",
    "/marketplace",
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
  if (req.auth && suspended) {
    /**
     * Clear the session cookies inline and send the user straight to /login,
     * rather than bouncing through /api/auth/signout. Eliminates one extra
     * hop and guarantees no loop even if the signout handler were to fail.
     */
    const dest = new URL("/login?reason=suspended", req.url);
    return clearAuthCookies(NextResponse.redirect(dest));
  }

  const rawHost = req.headers.get("host");
  const hostNoPort = stripPortFromHost(rawHost);
  const primaryHost = primaryAppHostname();
  if (hostNoPort && primaryHost) {
    const hNorm = normalizeDomainName(hostNoPort);
    if (hNorm && hNorm !== primaryHost && hNorm !== "localhost" && hNorm !== "127.0.0.1") {
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
            if (studioId) {
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

  const impersonatorId = (req.auth?.user as { impersonatorId?: string })?.impersonatorId;
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