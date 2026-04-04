import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Record a feature usage event (authenticated users). Aggregates into FeatureUsageFact for finance/feature ROI.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { featureKey?: string; eventName?: string; studioId?: string; costCents?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const featureKey = typeof body.featureKey === "string" ? body.featureKey.trim() : "";
  const eventName = typeof body.eventName === "string" ? body.eventName.trim() : "default";
  if (!featureKey || featureKey.length > 120) {
    return NextResponse.json({ error: "featureKey required" }, { status: 400 });
  }

  const day = utcDay(new Date());
  const studioId = typeof body.studioId === "string" ? body.studioId : null;
  const costCents = typeof body.costCents === "number" && body.costCents >= 0 ? Math.floor(body.costCents) : 0;

  const existing = await prisma.featureUsageFact.findFirst({
    where: {
      eventDate: day,
      featureKey,
      eventName,
      userId: user.id,
      studioId: studioId ?? null,
    },
  });

  if (existing) {
    await prisma.featureUsageFact.update({
      where: { id: existing.id },
      data: {
        usageCount: { increment: 1 },
        costCents: { increment: costCents },
      },
    });
  } else {
    await prisma.featureUsageFact.create({
      data: {
        eventDate: day,
        featureKey,
        eventName,
        userId: user.id,
        studioId,
        usageCount: 1,
        costCents,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
