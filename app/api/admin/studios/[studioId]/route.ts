import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

type Ctx = { params: Promise<{ studioId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { studioId } = await ctx.params;
  let body: { status?: string; rejectionReason?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const status = body.status;
  if (status !== "approved" && status !== "rejected" && status !== "suspended" && status !== "pending_review") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const data: {
    status: typeof status;
    rejectionReason?: string | null;
    approvedAt?: Date | null;
  } = { status: status as "approved" | "rejected" | "suspended" | "pending_review" };

  if (status === "approved") {
    data.approvedAt = new Date();
    data.rejectionReason = null;
  } else if (status === "rejected") {
    data.rejectionReason = body.rejectionReason ?? "Rejected";
    data.approvedAt = null;
  } else {
    data.approvedAt = null;
  }

  const before = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { status: true, rejectionReason: true, displayName: true },
  });

  const studio = await prisma.studio.update({
    where: { id: studioId },
    data,
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "studio.status_update",
    entityType: "studio",
    entityId: studioId,
    before: before
      ? { status: before.status, rejectionReason: before.rejectionReason, displayName: before.displayName }
      : null,
    after: {
      status: studio.status,
      rejectionReason: studio.rejectionReason,
      displayName: studio.displayName,
    },
    reason: typeof body.rejectionReason === "string" ? body.rejectionReason : status,
  });

  return NextResponse.json({ studio });
}