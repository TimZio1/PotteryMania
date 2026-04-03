import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getStripe } from "@/lib/stripe";

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
  if (studio.status !== "approved") {
    return NextResponse.json({ error: "Studio must be approved first" }, { status: 403 });
  }

  const stripe = getStripe();
  let row = await prisma.stripeAccount.findUnique({ where: { studioId } });
  if (!row) {
    const countryCode = (studio.country || "GR").substring(0, 2).toUpperCase();
    const acct = await stripe.accounts.create({
      type: "express",
      country: countryCode,
      email: studio.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    row = await prisma.stripeAccount.create({
      data: {
        studioId,
        stripeAccountId: acct.id,
        onboardingStatus: "pending",
      },
    });
  }

  const link = await stripe.accountLinks.create({
    account: row.stripeAccountId,
    refresh_url: `${baseUrl()}/dashboard?stripe=refresh`,
    return_url: `${baseUrl()}/dashboard?stripe=done`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}