import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptions = await prisma.offeringSubscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, title: true } },
      experience: { select: { id: true, title: true } },
      studio: { select: { id: true, displayName: true } },
    },
    take: 100,
  });

  return NextResponse.json({ subscriptions });
}
