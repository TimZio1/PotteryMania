import { prisma } from "@/lib/db";
import { sendEmailVerificationEmail } from "@/lib/email/email-verification";
import {
  generateRawResetToken,
  hashResetToken,
} from "@/lib/password-reset-token";

/** 48 hours — links in inbox remain usable across time zones. */
export const EMAIL_VERIFICATION_TTL_MS = 48 * 60 * 60 * 1000;

export async function issueEmailVerificationToken(userId: string, email: string) {
  const raw = generateRawResetToken();
  const tokenHash = hashResetToken(raw);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({
      where: { userId, usedAt: null },
    }),
    prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ]);
  try {
    await sendEmailVerificationEmail({ to: email, token: raw });
  } catch (e) {
    console.error("[email-verification] send failed", e);
  }
}
