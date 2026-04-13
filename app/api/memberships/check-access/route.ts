import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const experienceId = typeof body.experienceId === "string" ? body.experienceId.trim() : "";
  if (!experienceId) return NextResponse.json({ error: "experienceId is required" }, { status: 400 });

  const now = new Date();
  const purchase = await prisma.membershipPurchase.findFirst({
    where: {
      userId: user.id,
      status: "active",
      startsAt: { lte: now },
      expiresAt: { gte: now },
      membership: {
        isActive: true,
        experiences: { some: { experienceId } },
      },
    },
    orderBy: { expiresAt: "asc" },
    include: {
      membership: { select: { id: true, name: true, sessionsPerPeriod: true } },
    },
  });

  if (!purchase) {
    return NextResponse.json({ hasAccess: false, reason: "no_active_membership" });
  }

  const sessionsRemaining =
    purchase.membership.sessionsPerPeriod == null
      ? null
      : Math.max(0, purchase.membership.sessionsPerPeriod - purchase.sessionsUsed);
  const hasSessionCapacity = sessionsRemaining == null || sessionsRemaining > 0;

  return NextResponse.json({
    hasAccess: hasSessionCapacity,
    reason: hasSessionCapacity ? "ok" : "membership_limit_reached",
    purchaseId: purchase.id,
    membership: purchase.membership,
    sessionsRemaining,
  });
}
