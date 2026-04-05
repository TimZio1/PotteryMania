import { NextResponse } from "next/server";
import {
  featureAnalyticsSnapshot,
  featureAnalyticsSnapshotToCsv,
  parseFeatureAnalyticsInactiveDays,
} from "@/lib/admin-feature-analytics";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const inactiveWindowDays = parseFeatureAnalyticsInactiveDays(url.searchParams.get("inactiveDays") ?? undefined);

  const snap = await featureAnalyticsSnapshot(prisma, { inactiveWindowDays });
  const body = featureAnalyticsSnapshotToCsv(snap);
  const filename = `feature-activations-analytics-${inactiveWindowDays}d.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
