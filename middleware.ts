import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const path = req.nextUrl.pathname;
  if ((path.startsWith("/dashboard") || path.startsWith("/admin")) && !req.auth) {
    const u = new URL("/login", req.url);
    u.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(u);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};