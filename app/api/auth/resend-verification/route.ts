import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import { issueEmailVerificationToken } from "@/lib/email-verification-flow";
import { isEmailTransportError } from "@/lib/email/email-transport-error";
import { logApiError } from "@/lib/monitoring";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const rate = assertRateLimit(req, `resend-verify:${session.user.id}`, 5, 15 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerifiedAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }
  try {
    await issueEmailVerificationToken(session.user.id, user.email);
  } catch (e) {
    logApiError("resend_verification", e, { userId: session.user.id }, req);
    if (isEmailTransportError(e) && e.code === "EMAIL_TRANSPORT_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error:
            "We couldn’t send your verification email because email isn’t configured on this server. Please try again later.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "We couldn’t send your verification email. Please try again." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
