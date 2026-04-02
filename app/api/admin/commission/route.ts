import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const global = await prisma.commissionRule.findFirst({
    where: { ruleScope: "global", studioId: null, itemType: "product", isActive: true },
    orderBy: { createdAt: "desc" },
  });
  const fallback = await prisma.adminConfig.findUnique({
    where: { configKey: "default_product_commission_bps" },
  });
  return NextResponse.json({ globalRule: global, fallback });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { percentageBasisPoints?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const bps = typeof body.percentageBasisPoints === "number" ? body.percentageBasisPoints : -1;
  if (bps < 0 || bps > 10000) {
    return NextResponse.json({ error: "percentageBasisPoints 0-10000" }, { status: 400 });
  }

  await prisma.commissionRule.updateMany({
    where: { ruleScope: "global", studioId: null, itemType: "product" },
    data: { isActive: false },
  });
  const rule = await prisma.commissionRule.create({
    data: {
      ruleScope: "global",
      studioId: null,
      itemType: "product",
      percentageBasisPoints: bps,
      isActive: true,
    },
  });
  await prisma.adminConfig.upsert({
    where: { configKey: "default_product_commission_bps" },
    create: { configKey: "default_product_commission_bps", configValue: { bps } },
    update: { configValue: { bps } },
  });
  return NextResponse.json({ rule });
}