import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const before = await prisma.experiment.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { isActive?: boolean; variantBPercent?: number; name?: string; reason?: string };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_experiment_patch_invalid_json", e, { id }, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3) return NextResponse.json({ error: "reason required (min 3 chars)" }, { status: 400 });

  const data: { isActive?: boolean; variantBPercent?: number; name?: string } = {};
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.name === "string" && body.name.trim().length >= 2) data.name = body.name.trim();
  if (typeof body.variantBPercent === "number" && Number.isFinite(body.variantBPercent)) {
    data.variantBPercent = Math.min(100, Math.max(0, Math.floor(body.variantBPercent)));
  }

  const row = await prisma.experiment.update({ where: { id }, data });

  await logAdminAction({
    actorUserId: user.id,
    action: "experiment.update",
    entityType: "experiment",
    entityId: id,
    before: {
      isActive: before.isActive,
      variantBPercent: before.variantBPercent,
      name: before.name,
    },
    after: {
      isActive: row.isActive,
      variantBPercent: row.variantBPercent,
      name: row.name,
    },
    reason,
  });

  return NextResponse.json({ ok: true });
}
