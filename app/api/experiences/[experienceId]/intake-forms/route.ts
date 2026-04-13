import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPublicIntakeForms } from "@/lib/intake-forms/validate-responses";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ experienceId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { experienceId } = await ctx.params;

  const experience = await prisma.experience.findFirst({
    where: {
      id: experienceId,
      status: "active",
      visibility: "public",
      studio: {
        status: "approved",
        stripeAccount: { is: { chargesEnabled: true, payoutsEnabled: true } },
      },
    },
    select: { id: true },
  });

  if (!experience) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const forms = await getPublicIntakeForms(prisma, experienceId);
  return NextResponse.json({ forms });
}
