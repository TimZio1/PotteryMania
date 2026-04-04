import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { kilnFeatureDeniedResponse } from "@/lib/studio-features";

type Ctx = { params: Promise<{ studioId: string; itemId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, itemId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const kilnDenied = await kilnFeatureDeniedResponse(studioId);
  if (kilnDenied) return kilnDenied;

  const item = await prisma.kilnItem.findFirst({
    where: { id: itemId, firing: { studioId } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { status?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { status?: string; description?: string } = {};
  if (typeof body.status === "string" && body.status.trim()) data.status = body.status.trim();
  if (typeof body.description === "string" && body.description.trim()) data.description = body.description.trim();

  const updated = await prisma.kilnItem.update({ where: { id: itemId }, data });
  return NextResponse.json({ item: updated });
}
