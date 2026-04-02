import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import type { CancellationPolicyType } from "@prisma/client";

type Ctx = { params: Promise<{ studioId: string }> };

const TYPES: CancellationPolicyType[] = [
  "non_refundable",
  "refundable_until_hours",
  "partial_refund_until_hours",
  "custom",
];

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const policies = await prisma.cancellationPolicy.findMany({
    where: { studioId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ policies });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "vendor") {
    return NextResponse.json({ error: "Vendor role required" }, { status: 403 });
  }
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const policyType = body.policyType as CancellationPolicyType;
  if (!name || !TYPES.includes(policyType)) {
    return NextResponse.json({ error: "name and valid policyType required" }, { status: 400 });
  }

  const policy = await prisma.cancellationPolicy.create({
    data: {
      studioId,
      name,
      policyType,
      hoursBeforeStart: typeof body.hoursBeforeStart === "number" ? body.hoursBeforeStart : null,
      refundPercentage: typeof body.refundPercentage === "number" ? body.refundPercentage : null,
      customPolicyText: typeof body.customPolicyText === "string" ? body.customPolicyText.trim() || null : null,
      isActive: body.isActive === false ? false : true,
    },
  });

  return NextResponse.json({ policy }, { status: 201 });
}