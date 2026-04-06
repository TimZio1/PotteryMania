import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string; domainId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, domainId } = await ctx.params;

  const row = await prisma.vendorDomain.findFirst({
    where: { id: domainId, studioId, studio: { ownerUserId: user.id } },
    select: { id: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.vendorDomain.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
}
