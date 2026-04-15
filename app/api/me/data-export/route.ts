import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rl = checkRateLimit(`me_data_export:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many export requests. Try again shortly." }, { status: 429 });
  }

  const [userRow, profile, bookings, orders, reviews, memberships, packages, waitlistEntries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        marketingConsent: true,
        emailVerifiedAt: true,
      },
    }),
    prisma.customerProfile.findUnique({ where: { userId: user.id } }),
    prisma.booking.findMany({
      where: { customerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        studioId: true,
        experienceId: true,
        slotId: true,
        participantCount: true,
        bookingStatus: true,
        paymentStatus: true,
        totalAmountCents: true,
        depositAmountCents: true,
        remainingBalanceCents: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.order.findMany({
      where: { customerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderStatus: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        subtotalCents: true,
        shippingRateCents: true,
        taxCents: true,
        totalCents: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.review.findMany({
      where: { authorUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        studioId: true,
        productId: true,
        experienceId: true,
        bookingId: true,
        orderItemId: true,
        targetType: true,
        rating: true,
        title: true,
        body: true,
        isVisible: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.membershipPurchase.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        membershipId: true,
        status: true,
        startsAt: true,
        expiresAt: true,
        sessionsUsed: true,
        paidCents: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.classPackagePurchase.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        packageId: true,
        status: true,
        startsAt: true,
        expiresAt: true,
        creditsTotal: true,
        creditsUsed: true,
        paidCents: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.bookingWaitlistEntry.findMany({
      where: { customerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        studioId: true,
        experienceId: true,
        slotId: true,
        participantCount: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      consents: {
        marketing: Boolean(userRow?.marketingConsent),
        emailVerifiedAt: userRow?.emailVerifiedAt ?? null,
      },
    },
    profile: profile
      ? {
          fullName: profile.fullName,
          phone: profile.phone,
          preferredLanguage: profile.preferredLanguage,
          preferredCurrency: profile.preferredCurrency,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        }
      : null,
    bookings,
    orders,
    reviews,
    memberships,
    classPackages: packages,
    waitlistEntries,
  });
}
