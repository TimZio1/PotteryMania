import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRole, requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const TTL_MS = 60_000;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: targetUserId } = await ctx.params;
  if (!targetUserId || targetUserId === admin.id) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true, suspendedAt: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.suspendedAt) {
    return NextResponse.json({ error: "Cannot impersonate a suspended account" }, { status: 400 });
  }
  if (isAdminRole(target.role)) {
    return NextResponse.json({ error: "Cannot impersonate admin accounts" }, { status: 400 });
  }

  await prisma.impersonationGrant.deleteMany({ where: { adminUserId: admin.id } });

  const expiresAt = new Date(Date.now() + TTL_MS);
  const grant = await prisma.impersonationGrant.create({
    data: {
      adminUserId: admin.id,
      targetUserId: target.id,
      expiresAt,
    },
  });

  await logAdminAction({
    actorUserId: admin.id,
    action: "user.impersonate_grant",
    entityType: "user",
    entityId: target.id,
    before: null,
    after: { targetEmail: target.email, grantExpiresAt: expiresAt.toISOString() },
    reason: null,
  });

  return NextResponse.json({ grantId: grant.id });
}
