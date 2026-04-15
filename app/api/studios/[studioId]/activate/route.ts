import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return apiError(auth.error, auth.status);
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) return apiError("Studio not found", 404);
  const stripeRow = await prisma.stripeAccount.findUnique({ where: { studioId } });
  if (!stripeRow?.chargesEnabled || !stripeRow.payoutsEnabled) {
    return apiError("Connect Stripe first. Activation is automatic once Stripe is fully enabled.", 400);
  }
  await prisma.studio.update({
    where: { id: studioId },
    data: {
      activationPaidAt: studio.activationPaidAt ?? new Date(),
      activationSessionId: "stripe_connected_auto",
      status: studio.status === "approved" ? "approved" : "pending_review",
    },
  });
  return apiSuccess({
    activated: studio.status === "approved",
    awaitingReview: studio.status !== "approved",
    redirectTo: `/dashboard/studio/${studio.id}?activated=1`,
  });
}
