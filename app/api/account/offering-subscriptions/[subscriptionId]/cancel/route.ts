import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { recordOfferingSubscriptionEvent } from "@/lib/offering-subscriptions";

type Ctx = { params: Promise<{ subscriptionId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subscriptionId } = await ctx.params;

  const row = await prisma.offeringSubscription.findUnique({ where: { id: subscriptionId } });
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!row.stripeSubscriptionId) {
    return NextResponse.json({ error: "External subscription link missing." }, { status: 409 });
  }

  let body: { cancelAtPeriodEnd?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const cancelAtPeriodEnd = body.cancelAtPeriodEnd !== false;

  if (cancelAtPeriodEnd) {
    await getStripe().subscriptions.update(row.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    const periodEnd = row.currentPeriodEnd ?? row.nextBillingDate ?? new Date();
    await prisma.offeringSubscription.update({
      where: { id: row.id },
      data: {
        status: "pending_cancel",
        cancelAtPeriodEnd: true,
        autoRenew: false,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
      },
    });
    await recordOfferingSubscriptionEvent(row.id, "cancel_scheduled", { periodEnd: periodEnd.toISOString() });
    return NextResponse.json({ ok: true, cancelAtPeriodEnd: true, periodEnd: periodEnd.toISOString() });
  }

  await getStripe().subscriptions.cancel(row.stripeSubscriptionId);
  const now = new Date();
  await prisma.offeringSubscription.update({
    where: { id: row.id },
    data: {
      status: "canceled",
      cancelAtPeriodEnd: false,
      autoRenew: false,
      canceledAt: now,
      endedAt: now,
      nextBillingDate: null,
    },
  });
  await recordOfferingSubscriptionEvent(row.id, "canceled", { immediate: true });
  return NextResponse.json({ ok: true, canceled: true });
}
