import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  let body: {
    isActive?: boolean;
    name?: string | null;
    validUntil?: string | null;
    maxRedemptions?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const before = await prisma.coupon.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: {
    isActive?: boolean;
    name?: string | null;
    validUntil?: Date | null;
    maxRedemptions?: number | null;
  } = {};

  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.name !== undefined) {
    data.name = typeof body.name === "string" ? body.name.trim() || null : null;
  }
  if (body.validUntil !== undefined) {
    if (body.validUntil === null || body.validUntil === "") {
      data.validUntil = null;
    } else if (typeof body.validUntil === "string") {
      const d = new Date(body.validUntil);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid validUntil" }, { status: 400 });
      }
      data.validUntil = d;
    }
  }
  if (body.maxRedemptions !== undefined) {
    if (body.maxRedemptions === null) {
      data.maxRedemptions = null;
    } else if (Number.isFinite(Number(body.maxRedemptions))) {
      data.maxRedemptions = Math.max(0, Math.floor(Number(body.maxRedemptions)));
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const updated = await prisma.coupon.update({
    where: { id },
    data,
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "coupon.patch",
    entityType: "coupon",
    entityId: id,
    before: {
      isActive: before.isActive,
      name: before.name,
      validUntil: before.validUntil?.toISOString() ?? null,
      maxRedemptions: before.maxRedemptions,
    },
    after: {
      isActive: updated.isActive,
      name: updated.name,
      validUntil: updated.validUntil?.toISOString() ?? null,
      maxRedemptions: updated.maxRedemptions,
    },
  });

  return NextResponse.json({ ok: true });
}
