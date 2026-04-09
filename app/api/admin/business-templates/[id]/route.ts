import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { mapBusinessTemplateRow } from "@/lib/business-templates";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: {
    isVisible?: boolean;
    priceCents?: number;
    currency?: string;
    isFeatured?: boolean;
    isPlatformRecommended?: boolean;
    isDefault?: boolean;
    sortOrder?: number;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_business_templates_patch_invalid_json", e, { id }, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 8) {
    return NextResponse.json({ error: "reason required (at least 8 characters)" }, { status: 400 });
  }

  const before = await prisma.businessTemplate.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Prisma.BusinessTemplateUpdateInput = {};

  if (typeof body.isVisible === "boolean") data.isVisible = body.isVisible;
  if (typeof body.priceCents === "number" && Number.isFinite(body.priceCents) && body.priceCents >= 0) {
    data.priceCents = Math.round(body.priceCents);
  }
  if (typeof body.currency === "string" && body.currency.trim().length === 3) {
    data.currency = body.currency.trim().toUpperCase();
  }
  if (typeof body.isFeatured === "boolean") data.isFeatured = body.isFeatured;
  if (typeof body.isPlatformRecommended === "boolean") data.isPlatformRecommended = body.isPlatformRecommended;
  if (typeof body.isDefault === "boolean") data.isDefault = body.isDefault;
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.round(body.sortOrder);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (body.isDefault === true) {
      await tx.businessTemplate.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false },
      });
    }
    return tx.businessTemplate.update({
      where: { id },
      data,
    });
  });

  const auditPick = (r: typeof before) => ({
    slug: r.slug,
    isVisible: r.isVisible,
    priceCents: r.priceCents,
    currency: r.currency,
    isFeatured: r.isFeatured,
    isPlatformRecommended: r.isPlatformRecommended,
    isDefault: r.isDefault,
    sortOrder: r.sortOrder,
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "business_template.patch",
    entityType: "business_template",
    entityId: id,
    before: auditPick(before) as Prisma.InputJsonValue,
    after: auditPick(updated) as Prisma.InputJsonValue,
    reason,
  });

  return NextResponse.json({ template: mapBusinessTemplateRow(updated) });
}
