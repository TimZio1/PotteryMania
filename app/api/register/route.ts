import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";
import { assertRateLimit } from "@/lib/rate-limit";
import { issueEmailVerificationToken } from "@/lib/email-verification-flow";
import { isEmailTransportError } from "@/lib/email/email-transport-error";
import { logApiError } from "@/lib/monitoring";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "register", 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many registration attempts" }, { status: 429 });
  }
  let body: { email?: string; password?: string; role?: string; marketingConsent?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role: UserRole = "customer";
  if (!EMAIL.test(email) || password.length < 8) {
    return NextResponse.json(
      { error: "Valid email and password (min 8 characters) required" },
      { status: 400 }
    );
  }
  const marketingConsent = body.marketingConsent === true;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, role, marketingConsent },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  try {
    await issueEmailVerificationToken(user.id, user.email);
  } catch (e) {
    logApiError("register_verification_token", e, { userId: user.id }, req);
    try {
      await prisma.user.delete({ where: { id: user.id } });
    } catch {
      /* ignore rollback failure */
    }
    if (isEmailTransportError(e) && e.code === "EMAIL_TRANSPORT_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error:
            "We couldn’t send your verification email because email isn’t configured on this server. Please try again later.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "We couldn’t send your verification email. Please try again." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}