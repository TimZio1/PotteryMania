import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invites = await prisma.referralInvite.findMany({
    where: { inviterStudioId: studioId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ invites });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { inviteEmail?: string; rewardNote?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const inviteCode = randomUUID().slice(0, 8).toUpperCase();
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const invite = await prisma.referralInvite.create({
    data: {
      inviterStudioId: studioId,
      inviteCode,
      inviteEmail: body.inviteEmail?.trim().toLowerCase() || null,
      rewardNote: body.rewardNote?.trim() || "Referral reward pending",
      inviteUrl: `${baseUrl}/early-access?ref=${inviteCode}`,
      invitedAt: new Date(),
    },
  });
  return NextResponse.json({ invite }, { status: 201 });
}
