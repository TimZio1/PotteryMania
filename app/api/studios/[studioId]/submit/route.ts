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
  if (studio.status !== "draft" && studio.status !== "rejected") {
    return NextResponse.json({ error: "Can only submit from draft or rejected" }, { status: 400 });
  }

  const updated = await prisma.studio.update({
    where: { id: studioId },
    data: {
      status: "pending_review",
      rejectionReason: null,
    },
  });
  return NextResponse.json({ studio: updated });
}