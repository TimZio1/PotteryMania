import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import type { CommissionItemType } from "@prisma/client";

const VALID_ITEM_TYPES: CommissionItemType[] = ["product", "booking"];

export async function GET() {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const productRule = await prisma.commissionRule.findFirst({
    where: { ruleScope: "global", studioId: null, itemType: "product", isActive: true },
    orderBy: { createdAt: "desc" },
  });
  const bookingRule = await prisma.commissionRule.findFirst({
    where: { ruleScope: "global", studioId: null, itemType: "booking", isActive: true },
    orderBy: { createdAt: "desc" },
  });
  const fallback = await prisma.adminConfig.findUnique({
    where: { configKey: "default_product_commission_bps" },
  });
  return NextResponse.json({ productRule, bookingRule, fallback });
}

export async function PATCH(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { percentageBasisPoints?: number; itemType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const bps = typeof body.percentageBasisPoints === "number" ? body.percentageBasisPoints : -1;
  if (bps < 0 || bps > 10000) {
    return NextResponse.json({ error: "percentageBasisPoints 0-10000" }, { status: 400 });
  }
  const itemType = (
    typeof body.itemType === "string" && VALID_ITEM_TYPES.includes(body.itemType as CommissionItemType)
      ? body.itemType
      : "product"
  ) as CommissionItemType;

  await prisma.commissionRule.updateMany({
    where: { ruleScope: "global", studioId: null, itemType },
    data: { isActive: false },
  });
  const rule = await prisma.commissionRule.create({
    data: {
      ruleScope: "global",
      studioId: null,
      itemType,
      percentageBasisPoints: bps,
      isActive: true,
    },
  });
  if (itemType === "product") {
    await prisma.adminConfig.upsert({
      where: { configKey: "default_product_commission_bps" },
      create: { configKey: "default_product_commission_bps", configValue: { bps } },
      update: { configValue: { bps } },
    });
  }
  return NextResponse.json({ rule });
}