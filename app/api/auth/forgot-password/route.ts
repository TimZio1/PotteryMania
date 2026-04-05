import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import {
  generateRawResetToken,
  hashResetToken,
  PASSWORD_RESET_TTL_MS,
} from "@/lib/password-reset-token";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "password-reset:request", 5, 15 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!EMAIL.test(email)) {
    return NextResponse.json({ ok: true });
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  if (!user?.passwordHash) {
    return NextResponse.json({ ok: true });
  }
  const raw = generateRawResetToken();
  const tokenHash = hashResetToken(raw);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
  ]);
  try {
    await sendPasswordResetEmail({ to: email, resetToken: raw });
  } catch (e) {
    console.error("[password-reset] send failed", e);
  }
  return NextResponse.json({ ok: true });
}
