import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const studioId = searchParams.get("studioId")?.trim() || null;
  const now = new Date();

  const memberships = await prisma.membershipPurchase.findMany({
    where: {
      userId: user.id,
      ...(studioId ? { membership: { studioId } } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      membership: {
        include: {
          studio: { select: { id: true, displayName: true } },
          experiences: { include: { experience: { select: { id: true, title: true } } } },
        },
      },
    },
  });

  return NextResponse.json({
    memberships: memberships.map((purchase) => ({
      ...purchase,
      isActiveNow:
        purchase.status === "active" &&
        purchase.startsAt <= now &&
        purchase.expiresAt >= now &&
        (purchase.membership.sessionsPerPeriod == null || purchase.sessionsUsed < purchase.membership.sessionsPerPeriod),
      sessionsRemaining:
        purchase.membership.sessionsPerPeriod == null
          ? null
          : Math.max(0, purchase.membership.sessionsPerPeriod - purchase.sessionsUsed),
    })),
  });
}
