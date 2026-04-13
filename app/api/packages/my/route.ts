import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studioId = searchParams.get("studioId")?.trim() || null;
  const experienceId = searchParams.get("experienceId")?.trim() || null;
  const onlyActive = searchParams.get("onlyActive") !== "0";
  const now = new Date();

  const purchases = await prisma.classPackagePurchase.findMany({
    where: {
      userId: user.id,
      ...(studioId ? { package: { studioId } } : {}),
      ...(onlyActive
        ? {
            status: "active",
            startsAt: { lte: now },
            expiresAt: { gte: now },
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      package: {
        include: {
          studio: { select: { id: true, displayName: true } },
          items: {
            include: {
              experience: { select: { id: true, title: true } },
            },
          },
        },
      },
      usages: {
        where: { refunded: false },
        select: { id: true, bookingId: true, creditsUsed: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  const filtered = experienceId
    ? purchases.filter((purchase) => purchase.package.items.some((item) => item.experienceId === experienceId))
    : purchases;

  const packagePurchases = filtered.map((purchase) => {
    const creditsRemaining = Math.max(0, purchase.creditsTotal - purchase.creditsUsed);
    const matchingExperienceItem = experienceId
      ? purchase.package.items.find((item) => item.experienceId === experienceId)
      : null;
    const creditsRequiredForExperience = matchingExperienceItem?.quantity ?? null;
    return {
      ...purchase,
      creditsRemaining,
      creditsRequiredForExperience,
      canUseForExperience:
        creditsRequiredForExperience != null &&
        purchase.status === "active" &&
        purchase.startsAt <= now &&
        purchase.expiresAt >= now &&
        creditsRemaining >= creditsRequiredForExperience,
    };
  });

  return NextResponse.json({ packagePurchases });
}
