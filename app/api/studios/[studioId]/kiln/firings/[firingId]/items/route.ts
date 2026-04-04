import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { kilnFeatureDeniedResponse } from "@/lib/studio-features";

type Ctx = { params: Promise<{ studioId: string; firingId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, firingId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const kilnDenied = await kilnFeatureDeniedResponse(studioId);
  if (kilnDenied) return kilnDenied;

  const firing = await prisma.kilnFiring.findFirst({ where: { id: firingId, studioId } });
  if (!firing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) return NextResponse.json({ error: "description required" }, { status: 400 });

  const item = await prisma.kilnItem.create({
    data: { firingId, description, status: "queued" },
  });
  return NextResponse.json({ item });
}
