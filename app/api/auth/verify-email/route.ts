import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import { hashResetToken } from "@/lib/password-reset-token";

function redirectBase(req: Request) {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    process.env.AUTH_URL?.replace(/\/+$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/+$/, "");
  if (env) return env;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function GET(req: Request) {
  const base = redirectBase(req);
  const fail = new URL("/login?verified=invalid", base);
  const ok = new URL("/login?verified=1", base);
  const rate = assertRateLimit(req, "verify-email:get", 40, 60_000);
  if (!rate.allowed) {
    return NextResponse.redirect(fail);
  }
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(fail);
  }
  const tokenHash = hashResetToken(token);
  const row = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  const now = new Date();
  if (!row) {
    return NextResponse.redirect(fail);
  }
  if (row.usedAt) {
    const u = await prisma.user.findUnique({
      where: { id: row.userId },
      select: { emailVerifiedAt: true },
    });
    if (u?.emailVerifiedAt) {
      return NextResponse.redirect(ok);
    }
    return NextResponse.redirect(fail);
  }
  if (row.expiresAt <= now) {
    return NextResponse.redirect(fail);
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerifiedAt: now },
    }),
    prisma.emailVerificationToken.update({
      where: { id: row.id },
      data: { usedAt: now },
    }),
  ]);
  return NextResponse.redirect(ok);
}
