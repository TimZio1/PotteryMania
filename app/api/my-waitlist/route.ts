import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const emailNorm = user.email.trim().toLowerCase();

  const entries = await prisma.bookingWaitlistEntry.findMany({
    where: {
      OR: [{ customerUserId: user.id }, { customerEmail: emailNorm }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      experience: { select: { id: true, title: true } },
      slot: { select: { slotDate: true, startTime: true, endTime: true, status: true } },
      studio: { select: { displayName: true } },
    },
  });

  return NextResponse.json({ entries });
}
