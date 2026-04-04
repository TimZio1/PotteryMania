import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  canBrowseDuringPreregistration,
  isPreregistrationClosedPath,
  isPreregistrationOnly,
} from "@/lib/preregistration";

const LOGIN_REQUIRED = ["/dashboard", "/admin", "/my-bookings", "/my-waitlist", "/cart"];
/** Public without marketplace; /register only when browsing is open (not preregistration-only). */
const BASE_PUBLIC_CORE = [
  "/",
  "/early-access",
  "/login",
  "/checkout/success",
  "/unauthorized-admin",
];
const BROWSING_PUBLIC = ["/marketplace", "/classes", "/studios"];

function publicAllowlist(): string[] {
  if (isPreregistrationOnly()) return BASE_PUBLIC_CORE;
  return [...BASE_PUBLIC_CORE, "/register", ...BROWSING_PUBLIC];
}

export default auth((req) => {
  const path = req.nextUrl.pathname;
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