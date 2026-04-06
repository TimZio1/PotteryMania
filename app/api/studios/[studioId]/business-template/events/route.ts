import { NextResponse } from "next/server";
import type { BusinessTemplateFunnelEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

const ALLOWED: BusinessTemplateFunnelEventType[] = ["gallery_view", "drawer_open", "activate_click"];

type Ctx = { params: Promise<{ studioId: string }> };

/** Authenticated vendor: record template funnel analytics (best-effort). */
export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { eventType?: string; templateSlug?: string | null; meta?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.eventType as BusinessTemplateFunnelEventType;
  if (!ALLOWED.includes(eventType)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }

  const templateSlug =
    typeof body.templateSlug === "string" && body.templateSlug.trim()
      ? body.templateSlug.trim()
      : null;

  let meta: Prisma.InputJsonValue | undefined;
  if (body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)) {
    meta = JSON.parse(JSON.stringify(body.meta)) as Prisma.InputJsonValue;
  }

  await prisma.businessTemplateFunnelEvent.create({
    data: {
      studioId,
      templateSlug,
      eventType,
      ...(meta !== undefined ? { meta } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
