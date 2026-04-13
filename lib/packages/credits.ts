import type { Prisma } from "@prisma/client";

export async function getEligiblePackagePurchase(
  tx: Prisma.TransactionClient,
  input: {
    purchaseId: string;
    userId: string;
    studioId: string;
    experienceId: string;
    at?: Date;
  },
) {
  const now = input.at ?? new Date();
  const purchase = await tx.classPackagePurchase.findFirst({
    where: {
      id: input.purchaseId,
      userId: input.userId,
      status: "active",
      startsAt: { lte: now },
      expiresAt: { gte: now },
      package: {
        studioId: input.studioId,
        isActive: true,
      },
    },
    include: {
      package: {
        include: {
          items: {
            where: { experienceId: input.experienceId },
            select: { quantity: true, experienceId: true },
          },
        },
      },
    },
  });
  if (!purchase) return null;
  const packageItem = purchase.package.items[0];
  if (!packageItem) return null;
  const creditsRemaining = purchase.creditsTotal - purchase.creditsUsed;
  if (creditsRemaining < packageItem.quantity) return null;
  return {
    purchase,
    creditsToUse: packageItem.quantity,
    creditsRemaining,
  };
}

export async function consumePackageCreditForBooking(
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    purchaseId: string;
    userId: string;
    studioId: string;
    experienceId: string;
  },
) {
  const eligible = await getEligiblePackagePurchase(tx, {
    purchaseId: input.purchaseId,
    userId: input.userId,
    studioId: input.studioId,
    experienceId: input.experienceId,
  });
  if (!eligible) {
    return { ok: false as const, error: "Package purchase is no longer valid for this class" };
  }
  const creditsToUse = eligible.creditsToUse;
  const nextUsed = eligible.purchase.creditsUsed + creditsToUse;
  const nextStatus = nextUsed >= eligible.purchase.creditsTotal ? "fully_used" : "active";

  try {
    await tx.classPackageUsage.create({
      data: {
        purchaseId: eligible.purchase.id,
        bookingId: input.bookingId,
        experienceId: input.experienceId,
        creditsUsed: creditsToUse,
      },
    });
  } catch {
    return { ok: true as const, alreadyUsed: true as const };
  }

  await tx.classPackagePurchase.update({
    where: { id: eligible.purchase.id },
    data: {
      creditsUsed: { increment: creditsToUse },
      status: nextStatus,
    },
  });

  return { ok: true as const, alreadyUsed: false as const, creditsUsed: creditsToUse };
}
