import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getStripe } from "@/lib/stripe";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const row = await prisma.stripeAccount.findUnique({ where: { studioId } });
  if (!row) return NextResponse.json({ stripe: null });

  const stripe = getStripe();
  const acct = await stripe.accounts.retrieve(row.stripeAccountId);
  const chargesEnabled = Boolean(acct.charges_enabled);
  const payoutsEnabled = Boolean(acct.payouts_enabled);
  const detailsSubmitted = Boolean(acct.details_submitted);
  let onboardingStatus = row.onboardingStatus;
  if (chargesEnabled && payoutsEnabled) onboardingStatus = "connected";
  else if (acct.requirements?.disabled_reason) onboardingStatus = "restricted";

  const updated = await prisma.stripeAccount.update({
    where: { studioId },
    data: {
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      onboardingStatus,
    },
  });
  return NextResponse.json({ stripe: updated });
}