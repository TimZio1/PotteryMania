import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { getStripe } from "@/lib/stripe";
import { logAdminAction } from "@/lib/admin-audit";
import { attemptWearAffiliatePayoutForStudio } from "@/lib/wear-affiliate-payouts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string }> };

function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function stripeStatusFromAccount(account: {
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  details_submitted?: boolean | null;
  requirements?: { disabled_reason?: string | null } | null;
}) {
  if (account.payouts_enabled && account.details_submitted) return "connected";
  if (account.requirements?.disabled_reason) return "restricted";
  return "pending";
}

export async function POST(_req: Request, ctx: Ctx) {
  const actor = await requireAdminUser();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studioId } = await ctx.params;
  const affiliate = await prisma.studioWearConfig.findUnique({
    where: { studioId },
    include: {
      studio: { select: { id: true, displayName: true, email: true, country: true } },
    },
  });
  if (!affiliate) return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });

  const stripe = getStripe();
  let row = await prisma.stripeAccount.findUnique({ where: { studioId } });

  if (!row) {
    const account = await stripe.accounts.create({
      type: "express",
      email: affiliate.studio.email || undefined,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        type: "wear_affiliate",
        studioId,
      },
    });

    row = await prisma.stripeAccount.create({
      data: {
        studioId,
        stripeAccountId: account.id,
        onboardingStatus: "pending",
      },
    });
  }

  const account = await stripe.accounts.retrieve(row.stripeAccountId);
  const status = stripeStatusFromAccount(account);
  const updated = await prisma.stripeAccount.update({
    where: { studioId },
    data: {
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
      onboardingStatus: status,
    },
  });

  if (updated.payoutsEnabled && updated.detailsSubmitted) {
    await attemptWearAffiliatePayoutForStudio({ studioId, currency: "EUR" });
    await logAdminAction({
      actorUserId: actor.id,
      action: "affiliate.stripe.sync",
      entityType: "stripe_account",
      entityId: updated.id,
      after: { studioId, stripeAccountId: updated.stripeAccountId, onboardingStatus: updated.onboardingStatus },
    });
    return NextResponse.json({ ok: true, stripe: updated, onboardingUrl: null });
  }

  const onboarding = await stripe.accountLinks.create({
    account: updated.stripeAccountId,
    refresh_url: `${baseUrl()}/wear/partner/apply?stripe=refresh`,
    return_url: `${baseUrl()}/wear/partner/apply?stripe=done`,
    type: "account_onboarding",
  });

  await logAdminAction({
    actorUserId: actor.id,
    action: "affiliate.stripe.onboarding_link",
    entityType: "stripe_account",
    entityId: updated.id,
    after: { studioId, stripeAccountId: updated.stripeAccountId, onboardingStatus: updated.onboardingStatus },
  });

  return NextResponse.json({ ok: true, stripe: updated, onboardingUrl: onboarding.url });
}
