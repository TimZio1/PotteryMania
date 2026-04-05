import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { clearRuntimeFlagCache } from "@/lib/runtime-feature-flags";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const flags = await prisma.featureFlag.findMany({ orderBy: { flagKey: "asc" } });
  return NextResponse.json({
    flags: flags.map((f) => ({
      id: f.id,
      flagKey: f.flagKey,
      flagValue: f.flagValue,
      isActive: f.isActive,
      updatedAt: f.updatedAt.toISOString(),
    })),
  });
}

export async function PATCH(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { id?: string; isActive?: boolean; flagValue?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id.length) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const before = await prisma.featureFlag.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: { isActive?: boolean; flagValue?: object } = {};
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.flagValue !== undefined && typeof body.flagValue === "object" && body.flagValue !== null) {
    data.flagValue = body.flagValue as object;
  }
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const updated = await prisma.featureFlag.update({
    where: { id },
    data,
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "feature_flag.update",
    entityType: "feature_flag",
    entityId: id,
    before: { flagKey: before.flagKey, isActive: before.isActive, flagValue: before.flagValue },
    after: { flagKey: updated.flagKey, isActive: updated.isActive, flagValue: updated.flagValue },
    reason: null,
  });

  clearRuntimeFlagCache(updated.flagKey);

  return NextResponse.json({ flag: updated });
}
