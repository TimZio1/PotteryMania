import { NextResponse } from "next/server";
import type { InsightComplexity, InsightTemplateCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

const CATEGORIES: InsightTemplateCategory[] = [
  "pricing",
  "schedule",
  "demand",
  "retention",
  "revenue",
  "capacity",
  "feature_rec",
];
const COMPLEX: InsightComplexity[] = ["simple", "medium", "advanced"];
const REASON_MAX = 500;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: {
    basePriceCents?: number;
    isActive?: boolean;
    title?: string;
    previewText?: string;
    analysisPrompt?: string;
    category?: string;
    complexity?: string;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_insight_template_patch_invalid_json", e, { id }, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const before = await prisma.insightTemplate.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Prisma.InsightTemplateUpdateInput = {};
  if (typeof body.basePriceCents === "number" && Number.isFinite(body.basePriceCents)) {
    data.basePriceCents = Math.max(0, Math.floor(body.basePriceCents));
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t.length > 0 && t.length <= 200) data.title = t;
  }
  if (typeof body.previewText === "string") {
    const t = body.previewText.trim();
    if (t.length <= 2000) data.previewText = t;
  }
  if (typeof body.analysisPrompt === "string") {
    const t = body.analysisPrompt.trim();
    if (t.length <= 8000) data.analysisPrompt = t;
  }
  if (typeof body.category === "string" && (CATEGORIES as string[]).includes(body.category)) {
    data.category = body.category as InsightTemplateCategory;
  }
  if (typeof body.complexity === "string" && (COMPLEX as string[]).includes(body.complexity)) {
    data.complexity = body.complexity as InsightComplexity;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ template: before });
  }

  let same = true;
  for (const [k, v] of Object.entries(data)) {
    if ((before as Record<string, unknown>)[k] !== v) {
      same = false;
      break;
    }
  }
  if (same) {
    return NextResponse.json({ template: before });
  }

  const reason =
    typeof body.reason === "string" ? body.reason.trim().slice(0, REASON_MAX) : null;

  const updated = await prisma.insightTemplate.update({
    where: { id },
    data,
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "insight_template.update",
    entityType: "insight_template",
    entityId: id,
    before: {
      slug: before.slug,
      basePriceCents: before.basePriceCents,
      isActive: before.isActive,
      title: before.title,
      category: before.category,
      complexity: before.complexity,
    },
    after: {
      slug: updated.slug,
      basePriceCents: updated.basePriceCents,
      isActive: updated.isActive,
      title: updated.title,
      category: updated.category,
      complexity: updated.complexity,
    },
    reason,
  });

  return NextResponse.json({ template: updated });
}
