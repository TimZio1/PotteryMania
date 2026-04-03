import { auth } from "@/auth";
import { NextResponse } from "next/server";

const LOGIN_REQUIRED = ["/dashboard", "/admin", "/my-bookings", "/my-waitlist", "/cart"];
const PUBLIC_ALLOWLIST = ["/", "/early-access", "/login", "/register", "/checkout/success"];

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_ALLOWLIST.some((p) => path === p || (p !== "/" && path.startsWith(p + "/")));
  const needsLogin = LOGIN_REQUIRED.some((p) => path === p || path.startsWith(p + "/"));

  if (needsLogin && !req.auth) {
    const u = new URL("/login", req.url);
    u.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(u);
  }

  // Stealth mode: keep the public surface very small until launch.
  if (!isPublic && !needsLogin && !req.auth) {
    return NextResponse.redirect(new URL("/early-access", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\..*).*)"],
};