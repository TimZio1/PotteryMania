import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const stripeRow = await prisma.stripeAccount.findUnique({ where: { studioId } });
  if (!stripeRow?.chargesEnabled || !stripeRow.payoutsEnabled) {
    return NextResponse.json(
      { error: "Connect Stripe first. Activation is automatic once Stripe is fully enabled." },
      { status: 400 },
    );
  }
  await prisma.studio.update({
    where: { id: studioId },
    data: {
      status: "approved",
      approvedAt: studio.approvedAt ?? new Date(),
      activationPaidAt: studio.activationPaidAt ?? new Date(),
      activationSessionId: "stripe_connected_auto",
    },
  });
  return NextResponse.json({ activated: true, redirectTo: `/dashboard/studio/${studio.id}?activated=1` });
}
