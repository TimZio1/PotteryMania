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

  const membershipId = typeof body.membershipId === "string" ? body.membershipId.trim() : "";
  if (!membershipId) return NextResponse.json({ error: "membershipId is required" }, { status: 400 });

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, isActive: true, isVisible: true },
    select: {
      id: true,
      studioId: true,
      durationDays: true,
      priceCents: true,
      isRecurring: true,
      recurringPriceCents: true,
      sessionsPerPeriod: true,
    },
  });
  if (!membership) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + membership.durationDays * 24 * 60 * 60 * 1000);
  const paidCents = membership.isRecurring && membership.recurringPriceCents != null ? membership.recurringPriceCents : membership.priceCents;

  const purchase = await prisma.membershipPurchase.create({
    data: {
      membershipId: membership.id,
      userId: user.id,
      startsAt,
      expiresAt,
      status: "active",
      sessionsUsed: 0,
      paidCents,
      isRecurring: membership.isRecurring,
    },
    include: {
      membership: { select: { id: true, name: true, studioId: true, sessionsPerPeriod: true, durationDays: true } },
    },
  });

  return NextResponse.json({ purchase }, { status: 201 });
}
