import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { executeAdminStripeOrderRefund } from "@/lib/orders/admin-stripe-order-refund";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await ctx.params;
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  let body: { reason?: string; amountCents?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason : "";
  let amountCents: number | undefined;
  if (body.amountCents === null || body.amountCents === undefined) {
    amountCents = undefined;
  } else if (typeof body.amountCents === "number" && Number.isFinite(body.amountCents)) {
    amountCents = Math.floor(body.amountCents);
  } else {
    return NextResponse.json({ error: "Invalid amountCents" }, { status: 400 });
  }

  const result = await executeAdminStripeOrderRefund({
    orderId,
    ...(amountCents !== undefined ? { amountCents } : {}),
    adminUserId: user.id,
    reason,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction({
    actorUserId: user.id,
    action: "order.stripe_refund",
    entityType: "order",
    entityId: orderId,
    after: {
      refundId: result.refundId,
      amountCents: result.amountCents,
      fullyRefunded: result.fullyRefunded,
      reason: reason.trim(),
    },
    reason: reason.trim(),
  });

  return NextResponse.json({
    ok: true,
    refundId: result.refundId,
    amountCents: result.amountCents,
    fullyRefunded: result.fullyRefunded,
  });
}
