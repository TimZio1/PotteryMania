import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFinanceAdmin } from "@/lib/finance/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await requireFinanceAdmin();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(searchParams.get("days") ?? "30")));
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);

  const facts = await prisma.featureUsageFact.findMany({
    where: { eventDate: { gte: from } },
  });

  const byFeature = new Map<
    string,
    { featureKey: string; usageCount: number; costCents: number; events: Record<string, number> }
  >();

  for (const f of facts) {
    const cur = byFeature.get(f.featureKey) ?? {
      featureKey: f.featureKey,
      usageCount: 0,
      costCents: 0,
      events: {} as Record<string, number>,
    };
    cur.usageCount += f.usageCount;
    cur.costCents += f.costCents;
    cur.events[f.eventName] = (cur.events[f.eventName] ?? 0) + f.usageCount;
    byFeature.set(f.featureKey, cur);
  }

  return NextResponse.json({
    features: [...byFeature.values()].sort((a, b) => b.costCents - a.costCents),
  });
}
