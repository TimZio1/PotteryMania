import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { ownerUserId: true } });
  if (!studio || studio.ownerUserId !== userId) return false;
  return true;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, id } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const coupon = await prisma.coupon.findFirst({ where: { id, studioId } });
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
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

  const hasPct = body.percentOff != null;
  const hasAmt = body.amountOffCents != null;
  if (hasPct && hasAmt) {
    return NextResponse.json({ error: "Use either percentage or fixed amount discount" }, { status: 400 });
  }

  const validFrom = body.validFrom ? new Date(body.validFrom) : null;
  const validUntil = body.validUntil ? new Date(body.validUntil) : null;
  if (validFrom && Number.isNaN(validFrom.getTime())) {
    return NextResponse.json({ error: "Invalid validFrom" }, { status: 400 });
  }
  if (validUntil && Number.isNaN(validUntil.getTime())) {
    return NextResponse.json({ error: "Invalid validUntil" }, { status: 400 });
  }

  const updated = await prisma.coupon.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name.trim() || null : undefined,
      percentOff: hasPct ? (body.percentOff ? Math.floor(body.percentOff) : null) : undefined,
      amountOffCents: hasAmt ? (body.amountOffCents ? Math.floor(body.amountOffCents) : null) : undefined,
      maxRedemptions:
        body.maxRedemptions != null && Number.isFinite(Number(body.maxRedemptions))
          ? Math.max(0, Math.floor(Number(body.maxRedemptions)))
          : undefined,
      maxPerCustomer:
        body.maxPerCustomer != null && Number.isFinite(Number(body.maxPerCustomer))
          ? Math.max(0, Math.floor(Number(body.maxPerCustomer)))
          : undefined,
      minSubtotalCents:
        body.minSubtotalCents != null && Number.isFinite(Number(body.minSubtotalCents))
          ? Math.max(0, Math.floor(Number(body.minSubtotalCents)))
          : undefined,
      validFrom: body.validFrom != null ? validFrom : undefined,
      validUntil: body.validUntil != null ? validUntil : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    },
    select: { id: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, id } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.coupon.deleteMany({ where: { id, studioId } });
  return NextResponse.json({ ok: true });
}
