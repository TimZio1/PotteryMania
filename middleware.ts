import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  canBrowseDuringPreregistration,
  isPreregistrationClosedPath,
  isPreregistrationOnly,
} from "@/lib/preregistration";
import {
  canonicalPublicOrigin,
  normalizeDomainName,
  primaryAppHostname,
  stripPortFromHost,
  vendorDomainResolveFetchBaseUrl,
} from "@/lib/vendor-domain-core";

const LOGIN_REQUIRED = ["/dashboard", "/admin", "/my-bookings", "/my-waitlist", "/cart", "/account"];
/** Public without marketplace; /register only when browsing is open (not preregistration-only). */
const BASE_PUBLIC_CORE = [
  "/",
  "/early-access",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/vendor-terms",
  "/checkout/success",
  "/unauthorized-admin",
];
const BROWSING_PUBLIC = ["/marketplace", "/classes", "/studios"];

function publicAllowlist(): string[] {
  if (isPreregistrationOnly()) return BASE_PUBLIC_CORE;
  return [...BASE_PUBLIC_CORE, "/register", ...BROWSING_PUBLIC];
}

export default auth(async (req) => {
  const suspended = Boolean(req.auth?.user && (req.auth.user as { suspended?: boolean }).suspended);
  if (req.auth && suspended) {
    const signout = new URL("/api/auth/signout", req.url);
    signout.searchParams.set("callbackUrl", new URL("/login?reason=suspended", req.url).toString());
    return NextResponse.redirect(signout);
  }

  const path = req.nextUrl.pathname;

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
          const res = await fetch(resolveUrl, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
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

  // During preregistration, the conversion-focused landing lives at /early-access.
  // Guests and customers still matched "/" to the old long homepage — send them to the new page.
  // Vendors and admins keep "/" for demos and QA.
  if (
    isPreregistrationOnly() &&
    path === "/" &&
    !canBrowseDuringPreregistration(req.auth?.user?.role)
  ) {
    return NextResponse.redirect(new URL("/early-access", req.url));
  }

  if (needsLogin && !req.auth) {
    const u = new URL("/login", req.url);
    u.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(u);
  }

  if (
    isPreregistrationOnly() &&
    isPreregistrationClosedPath(path) &&
    !canBrowseDuringPreregistration(req.auth?.user?.role)
  ) {
    const dest = req.auth ? "/" : "/early-access";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (!isPublic && !needsLogin && !req.auth) {
    return NextResponse.redirect(new URL("/early-access", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\..*).*)"],
};