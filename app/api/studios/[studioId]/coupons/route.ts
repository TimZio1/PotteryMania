import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { normalizeCouponCode } from "@/lib/coupon-checkout";

type Ctx = { params: Promise<{ studioId: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { ownerUserId: true } });
  if (!studio || studio.ownerUserId !== userId) return false;
  return true;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const coupons = await prisma.coupon.findMany({
    where: { studioId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    coupons: coupons.map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      percentOff: coupon.percentOff,
      amountOffCents: coupon.amountOffCents,
      maxRedemptions: coupon.maxRedemptions,
      maxPerCustomer: coupon.maxPerCustomer,
      minSubtotalCents: coupon.minSubtotalCents,
      redeemedCount: coupon.redeemedCount,
      validFrom: coupon.validFrom?.toISOString() ?? null,
      validUntil: coupon.validUntil?.toISOString() ?? null,
      isActive: coupon.isActive,
    })),
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: {
    code?: string;
    name?: string | null;
    percentOff?: number | null;
    amountOffCents?: number | null;
    maxRedemptions?: number | null;
    maxPerCustomer?: number | null;
    minSubtotalCents?: number | null;
    validFrom?: string | null;
    validUntil?: string | null;
    isActive?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = normalizeCouponCode(body.code ?? "");
  if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

  const pct = body.percentOff != null ? Number(body.percentOff) : null;
  const amt = body.amountOffCents != null ? Number(body.amountOffCents) : null;
  const hasPct = pct != null && Number.isFinite(pct) && pct > 0;
  const hasAmt = amt != null && Number.isFinite(amt) && amt > 0;
  if (hasPct === hasAmt) {
    return NextResponse.json({ error: "Use either percentage or fixed amount discount" }, { status: 400 });
  }
  if (hasPct && pct! > 100) {
    return NextResponse.json({ error: "percentOff cannot exceed 100" }, { status: 400 });
  }

  const validFrom = body.validFrom ? new Date(body.validFrom) : null;
  const validUntil = body.validUntil ? new Date(body.validUntil) : null;
  if (validFrom && Number.isNaN(validFrom.getTime())) {
    return NextResponse.json({ error: "Invalid validFrom" }, { status: 400 });
  }
  if (validUntil && Number.isNaN(validUntil.getTime())) {
    return NextResponse.json({ error: "Invalid validUntil" }, { status: 400 });
  }

  try {
    const created = await prisma.coupon.create({
      data: {
        studioId,
        code,
        name: body.name?.trim() || null,
        percentOff: hasPct ? Math.floor(pct!) : null,
        amountOffCents: hasAmt ? Math.floor(amt!) : null,
        maxRedemptions:
          body.maxRedemptions != null && Number.isFinite(Number(body.maxRedemptions))
            ? Math.max(0, Math.floor(Number(body.maxRedemptions)))
            : null,
        maxPerCustomer:
          body.maxPerCustomer != null && Number.isFinite(Number(body.maxPerCustomer))
            ? Math.max(0, Math.floor(Number(body.maxPerCustomer)))
            : null,
        minSubtotalCents:
          body.minSubtotalCents != null && Number.isFinite(Number(body.minSubtotalCents))
            ? Math.max(0, Math.floor(Number(body.minSubtotalCents)))
            : null,
        validFrom,
        validUntil,
        isActive: body.isActive !== false,
      },
      select: { id: true, code: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create coupon (duplicate code?)" }, { status: 400 });
  }
}
