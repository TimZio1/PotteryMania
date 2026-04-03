import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getStripe } from "@/lib/stripe";
import { isPromoActive } from "@/lib/promo";

const ACTIVATION_FEE_CENTS = 500; // €5.00

function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

type Ctx = { params: Promise<{ studioId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (studio.activationPaidAt) {
    return NextResponse.json({ error: "Already activated" }, { status: 400 });
  }
  if (studio.status !== "approved") {
    return NextResponse.json({ error: "Studio must be approved before activation" }, { status: 403 });
  }

  // During the launch promo, activate instantly — no payment required
  if (isPromoActive()) {
    await prisma.studio.update({
      where: { id: studioId },
      data: { activationPaidAt: new Date(), activationSessionId: "promo_free" },
    });
    return NextResponse.json({ free: true, redirectTo: `/dashboard/studio/${studio.id}?activated=1` });
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: ACTIVATION_FEE_CENTS,
          product_data: {
            name: "PotteryMania — Studio Activation",
            description: `One-time activation fee for "${studio.displayName}". Non-refundable.`,
          },
        },
      },
    ],
    metadata: {
      type: "studio_activation",
      studioId: studio.id,
    },
    success_url: `${baseUrl()}/dashboard/studio/${studio.id}?activated=1`,
    cancel_url: `${baseUrl()}/dashboard/studio/${studio.id}?activation_cancelled=1`,
  });

  await prisma.studio.update({
    where: { id: studioId },
    data: { activationSessionId: session.id },
  });

  return NextResponse.json({ url: session.url });
}
