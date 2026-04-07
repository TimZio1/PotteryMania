import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRole, requireHyperAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { assertRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Plan max: 4 hours; env may not exceed this. */
const MAX_TTL_MS = 4 * 60 * 60 * 1000;
const envTtl = Number(process.env.IMPERSONATION_GRANT_TTL_MS);
const TTL_MS = Math.min(
  MAX_TTL_MS,
  Number.isFinite(envTtl) && envTtl > 0 ? envTtl : 15 * 60 * 1000,
);

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const rate = assertRateLimit(req, "admin:impersonate", 20, 60 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many impersonation attempts" }, { status: 429 });
  }

  const admin = await requireHyperAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden — hyper_admin only" }, { status: 403 });
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
    action: "user.impersonation_start",
    entityType: "user",
    entityId: target.id,
    before: null,
    after: { targetEmail: target.email, grantExpiresAt: expiresAt.toISOString() },
    reason: null,
  });

  return NextResponse.json({ grantId: grant.id });
}
