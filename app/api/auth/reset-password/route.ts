import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import { hashResetToken } from "@/lib/password-reset-token";

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "password-reset:confirm", 10, 60 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token || password.length < 8) {
    return NextResponse.json(
      { error: "Invalid or expired reset link. Request a new one from the sign-in page." },
      { status: 400 },
    );
  }
  const tokenHash = hashResetToken(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  const now = new Date();
  if (!row || row.usedAt || row.expiresAt <= now) {
    return NextResponse.json(
      { error: "Invalid or expired reset link. Request a new one from the sign-in page." },
      { status: 400 },
    );
  }
  const passwordHash = await hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: now },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
