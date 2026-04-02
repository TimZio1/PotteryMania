import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user || !isAdminRole(user.role)) {
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

  const studio = await prisma.studio.update({
    where: { id: studioId },
    data,
  });
  return NextResponse.json({ studio });
}