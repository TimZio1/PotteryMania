import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return apiError(auth.error, auth.status);
  const updated = await prisma.studio.update({
    where: { id: studioId },
    data: {
      status: "pending_review",
      rejectionReason: null,
    },
  });
  return apiSuccess({ studio: updated });
}