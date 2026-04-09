import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import type { CommissionItemType } from "@prisma/client";
import { logApiError } from "@/lib/monitoring";
import { DEFAULT_PLATFORM_COMMISSION_BPS } from "@/lib/commission-defaults";

const VALID_ITEM_TYPES: CommissionItemType[] = ["product", "booking"];

export async function GET() {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    locked: true,
    percentageBasisPoints: DEFAULT_PLATFORM_COMMISSION_BPS,
    itemTypes: VALID_ITEM_TYPES,
  });
}

export async function PATCH(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { percentageBasisPoints?: number; itemType?: string };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_commission_patch_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const bps = typeof body.percentageBasisPoints === "number" ? body.percentageBasisPoints : DEFAULT_PLATFORM_COMMISSION_BPS;
  const itemType = (
    typeof body.itemType === "string" && VALID_ITEM_TYPES.includes(body.itemType as CommissionItemType)
      ? body.itemType
      : "product"
  ) as CommissionItemType;

  const rule = {
    id: "locked_global_commission",
    itemType,
    percentageBasisPoints: DEFAULT_PLATFORM_COMMISSION_BPS,
  };

  await logAdminAction({
    actorUserId: user.id,
    action: "commission.update_blocked_locked_model",
    entityType: "commission_rule",
    entityId: rule.id,
    before: { itemType, percentageBasisPoints: bps },
    after: { itemType, percentageBasisPoints: DEFAULT_PLATFORM_COMMISSION_BPS },
    reason: "Global commission is locked to 5% by marketplace policy.",
  });

  return NextResponse.json(
    {
      error: "Global commission is locked to 5% for both bookings and product sales.",
      locked: true,
      percentageBasisPoints: DEFAULT_PLATFORM_COMMISSION_BPS,
    },
    { status: 400 },
  );
}