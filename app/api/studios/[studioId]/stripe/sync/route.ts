import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return apiError(auth.error, auth.status);
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) return apiError("Studio not found", 404);
  const row = await prisma.stripeAccount.findUnique({ where: { studioId } });
  if (!row) return apiSuccess({ stripe: null });

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
  if (chargesEnabled && payoutsEnabled) {
    await prisma.studio.update({
      where: { id: studioId },
      data: {
        activationPaidAt: studio.activationPaidAt ?? new Date(),
        status: studio.status === "approved" ? "approved" : "pending_review",
      },
    });
  }
  return apiSuccess({ stripe: updated });
}