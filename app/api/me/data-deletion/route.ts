import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";

function anonymizedEmail(userId: string): string {
  return `deleted+${userId}@deleted.potterymania.local`;
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rl = checkRateLimit(`me_data_deletion:${user.id}`, 3, 60 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many deletion requests. Try again later." }, { status: 429 });
  }

  const now = new Date();
  const anonEmail = anonymizedEmail(user.id);
  const anonName = `Deleted User ${user.id.slice(0, 8)}`;

  await prisma.$transaction(async (tx) => {
    await Promise.all([
      tx.customerProfile.updateMany({
        where: { userId: user.id },
        data: {
          fullName: null,
          phone: null,
          preferredLanguage: null,
          preferredCurrency: null,
        },
      }),
      tx.booking.updateMany({
        where: { customerUserId: user.id },
        data: {
          customerName: anonName,
          customerEmail: anonEmail,
          customerPhone: null,
          notes: null,
        },
      }),
      tx.order.updateMany({
        where: { customerUserId: user.id },
        data: {
          customerName: anonName,
          customerEmail: anonEmail,
          customerPhone: null,
          notes: null,
          shippingAddressJson: Prisma.JsonNull,
          billingAddressJson: Prisma.JsonNull,
        },
      }),
      tx.bookingWaitlistEntry.updateMany({
        where: { customerUserId: user.id },
        data: {
          customerName: anonName,
          customerEmail: anonEmail,
        },
      }),
      tx.giftCard.updateMany({
        where: { purchaserUserId: user.id },
        data: {
          purchaserName: anonName,
          purchaserEmail: anonEmail,
        },
      }),
      tx.user.update({
        where: { id: user.id },
        data: {
          email: anonEmail,
          passwordHash: null,
          suspendedAt: now,
          suspendedReason: "self_deleted",
          emailVerifiedAt: null,
          marketingConsent: false,
          adminTags: [],
          calendarFeedToken: null,
          preferredLanguage: null,
          detectedRegion: null,
          regionOverride: null,
        },
      }),
    ]);
  });

  const response = NextResponse.json({
    ok: true,
    message: "Account anonymized. You have been signed out.",
  });

  for (const name of [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "__Host-next-auth.session-token",
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "__Host-authjs.session-token",
  ]) {
    response.cookies.set({ name, value: "", path: "/", maxAge: 0 });
  }

  return response;
}
