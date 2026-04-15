import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import type { CommissionItemType } from "@prisma/client";
import { logApiError } from "@/lib/monitoring";
import { DEFAULT_PLATFORM_COMMISSION_BPS } from "@/lib/commission-defaults";

const VALID_ITEM_TYPES: CommissionItemType[] = ["product", "booking"];
const VALID_SCOPE = ["global", "vendor"] as const;

const CONFIG_KEY_BY_ITEM: Record<CommissionItemType, string> = {
  product: "default_product_commission_bps",
  booking: "default_booking_commission_bps",
};

function parseBps(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const rounded = Math.round(raw);
  if (rounded < 0 || rounded > 10_000) return null;
  return rounded;
}

export async function GET() {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [globalRules, configs, overrides] = await Promise.all([
    prisma.commissionRule.findMany({
      where: { ruleScope: "global", itemType: { in: VALID_ITEM_TYPES }, isActive: true },
      orderBy: { updatedAt: "desc" },
      select: { itemType: true, percentageBasisPoints: true },
    }),
    prisma.adminConfig.findMany({
      where: { configKey: { in: [CONFIG_KEY_BY_ITEM.product, CONFIG_KEY_BY_ITEM.booking] } },
      select: { configKey: true, configValue: true },
    }),
    prisma.commissionRule.findMany({
      where: { ruleScope: "vendor", isActive: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
      include: {
        studio: { select: { id: true, displayName: true } },
      },
    }),
  ]);
  const globalBpsByItem: Record<CommissionItemType, number> = {
    product: DEFAULT_PLATFORM_COMMISSION_BPS,
    booking: DEFAULT_PLATFORM_COMMISSION_BPS,
  };
  for (const itemType of VALID_ITEM_TYPES) {
    const fromRule = globalRules.find((row) => row.itemType === itemType)?.percentageBasisPoints;
    if (typeof fromRule === "number") {
      globalBpsByItem[itemType] = fromRule;
      continue;
    }
    const configRow = configs.find((row) => row.configKey === CONFIG_KEY_BY_ITEM[itemType]);
    if (configRow && typeof configRow.configValue === "number" && configRow.configValue >= 0) {
      globalBpsByItem[itemType] = Math.round(configRow.configValue);
    }
  }

  return NextResponse.json({
    locked: false,
    global: globalBpsByItem,
    itemTypes: VALID_ITEM_TYPES,
    overrides: overrides.map((row) => ({
      id: row.id,
      studioId: row.studioId,
      studioName: row.studio?.displayName ?? "Unknown studio",
      itemType: row.itemType,
      percentageBasisPoints: row.percentageBasisPoints,
      isActive: row.isActive,
      updatedAt: row.updatedAt.toISOString(),
    })),
  });
}

export async function PATCH(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { percentageBasisPoints?: number; itemType?: string; scope?: string; studioId?: string | null };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_commission_patch_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const bps = parseBps(body.percentageBasisPoints);
  if (bps == null) {
    return NextResponse.json({ error: "percentageBasisPoints must be between 0 and 10000" }, { status: 400 });
  }
  const itemType = (
    typeof body.itemType === "string" && VALID_ITEM_TYPES.includes(body.itemType as CommissionItemType)
      ? body.itemType
      : "product"
  ) as CommissionItemType;
  const scope: (typeof VALID_SCOPE)[number] = VALID_SCOPE.includes(body.scope as (typeof VALID_SCOPE)[number])
    ? (body.scope as (typeof VALID_SCOPE)[number])
    : "global";
  const studioId =
    scope === "vendor" && typeof body.studioId === "string" && body.studioId.trim()
      ? body.studioId.trim()
      : null;
  if (scope === "vendor" && !studioId) {
    return NextResponse.json({ error: "studioId is required for vendor scope" }, { status: 400 });
  }

  if (scope === "vendor" && studioId) {
    const exists = await prisma.studio.findUnique({ where: { id: studioId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Studio not found" }, { status: 404 });
  }

  const existing = await prisma.commissionRule.findFirst({
    where: {
      ruleScope: scope,
      studioId,
      itemType,
      isActive: true,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, percentageBasisPoints: true, itemType: true, ruleScope: true, studioId: true },
  });
  const saved = await prisma.commissionRule.create({
    data: {
      ruleScope: scope,
      studioId,
      itemType,
      percentageBasisPoints: bps,
      isActive: true,
    },
  });
  if (scope === "global") {
    await prisma.adminConfig.upsert({
      where: { configKey: CONFIG_KEY_BY_ITEM[itemType] },
      create: { configKey: CONFIG_KEY_BY_ITEM[itemType], configValue: bps },
      update: { configValue: bps },
    });
  }
  if (existing?.id) {
    await prisma.commissionRule.update({
      where: { id: existing.id },
      data: { isActive: false },
    });
  }

  await logAdminAction({
    actorUserId: user.id,
    action: "commission.update",
    entityType: "commission_rule",
    entityId: saved.id,
    before: existing ?? null,
    after: {
      id: saved.id,
      ruleScope: saved.ruleScope,
      itemType: saved.itemType,
      studioId: saved.studioId,
      percentageBasisPoints: saved.percentageBasisPoints,
    },
    reason: scope === "global" ? "Updated global commission rate" : "Updated studio commission override",
  });

  return NextResponse.json({
    ok: true,
    rule: {
      id: saved.id,
      scope: saved.ruleScope,
      itemType: saved.itemType,
      studioId: saved.studioId,
      percentageBasisPoints: saved.percentageBasisPoints,
    },
  });
}