import { NextResponse } from "next/server";
import {
  featureActivationEventsExportFilename,
  featureActivationEventsExportRows,
  featureActivationEventsToCsv,
  parseFeatureEventsExportWindowDays,
} from "@/lib/admin-feature-activation-events-export";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const windowDays = parseFeatureEventsExportWindowDays(url.searchParams.get("inactiveDays") ?? undefined);
  const featureIdRaw = (url.searchParams.get("featureId") ?? "").trim();
  const featureId = featureIdRaw.length > 0 ? featureIdRaw : null;

  let featureSlug: string | null = null;
  if (featureId) {
    const f = await prisma.platformFeature.findUnique({
      where: { id: featureId },
      select: { slug: true },
    });
    if (!f) return NextResponse.json({ error: "Unknown featureId" }, { status: 400 });
    featureSlug = f.slug;
  }

  const rows = await featureActivationEventsExportRows(prisma, { windowDays, featureId });
  const body = featureActivationEventsToCsv(rows);
  const filename = featureActivationEventsExportFilename(windowDays, featureSlug);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
