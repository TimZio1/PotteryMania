import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string; entryId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const { studioId, entryId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const entry = await prisma.bookingWaitlistEntry.findFirst({
    where: { id: entryId, studioId },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.bookingWaitlistEntry.update({
    where: { id: entryId },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ ok: true });
}
