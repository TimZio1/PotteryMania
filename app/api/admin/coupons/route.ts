import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { normalizeCouponCode } from "@/lib/coupon-checkout";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    coupons: coupons.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      percentOff: c.percentOff,
      amountOffCents: c.amountOffCents,
      currency: c.currency,
      maxRedemptions: c.maxRedemptions,
      redeemedCount: c.redeemedCount,
      validFrom: c.validFrom?.toISOString() ?? null,
      validUntil: c.validUntil?.toISOString() ?? null,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    code?: string;
    name?: string | null;
    percentOff?: number | null;
    amountOffCents?: number | null;
    maxRedemptions?: number | null;
    validFrom?: string | null;
    validUntil?: string | null;
    isActive?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawCode = typeof body.code === "string" ? body.code.trim() : "";
  if (!rawCode) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }
  const code = normalizeCouponCode(rawCode);
  const pct = body.percentOff != null ? Number(body.percentOff) : null;
  const amt = body.amountOffCents != null ? Number(body.amountOffCents) : null;
  const hasPct = pct != null && Number.isFinite(pct) && pct > 0;
  const hasAmt = amt != null && Number.isFinite(amt) && amt > 0;
  if (!hasPct && !hasAmt) {
    return NextResponse.json({ error: "Set either percentOff or amountOffCents" }, { status: 400 });
  }
  if (hasPct && hasAmt) {
    return NextResponse.json({ error: "Use only one of percentOff or amountOffCents" }, { status: 400 });
  }
  if (hasPct && pct! > 100) {
    return NextResponse.json({ error: "percentOff cannot exceed 100" }, { status: 400 });
  }

  const validFrom =
    typeof body.validFrom === "string" && body.validFrom.length > 0 ? new Date(body.validFrom) : null;
  const validUntil =
    typeof body.validUntil === "string" && body.validUntil.length > 0 ? new Date(body.validUntil) : null;
  if (validFrom && Number.isNaN(validFrom.getTime())) {
    return NextResponse.json({ error: "Invalid validFrom" }, { status: 400 });
  }
  if (validUntil && Number.isNaN(validUntil.getTime())) {
    return NextResponse.json({ error: "Invalid validUntil" }, { status: 400 });
  }

  try {
    const created = await prisma.coupon.create({
      data: {
        code,
        name: typeof body.name === "string" ? body.name.trim() || null : null,
        percentOff: hasPct ? Math.floor(pct!) : null,
        amountOffCents: hasAmt ? Math.floor(amt!) : null,
        currency: "EUR",
        maxRedemptions:
          body.maxRedemptions != null && Number.isFinite(Number(body.maxRedemptions))
            ? Math.max(0, Math.floor(Number(body.maxRedemptions)))
            : null,
        validFrom,
        validUntil,
        isActive: body.isActive !== false,
      },
    });
    await logAdminAction({
      actorUserId: user.id,
      action: "coupon.create",
      entityType: "coupon",
      entityId: created.id,
      after: {
        code: created.code,
        percentOff: created.percentOff,
        amountOffCents: created.amountOffCents,
        isActive: created.isActive,
      },
    });
    return NextResponse.json({ id: created.id, code: created.code });
  } catch {
    return NextResponse.json({ error: "Could not create coupon (duplicate code?)" }, { status: 400 });
  }
}
