import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/**
 * P2-G directional export: one row per studio-feature activation with lifecycle fields (CSV).
 */
export async function GET(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const rows = await prisma.studioFeatureActivation.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      studioId: true,
      featureId: true,
      status: true,
      createdAt: true,
      activatedAt: true,
      deactivatesAt: true,
      feature: { select: { slug: true, name: true } },
      studio: { select: { displayName: true } },
    },
  });

  if (format === "csv") {
    const header = [
      "studio_id",
      "studio_name",
      "feature_slug",
      "feature_name",
      "status",
      "created_at",
      "activated_at",
      "deactivates_at",
    ];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.studioId,
          csvEscape(r.studio.displayName),
          csvEscape(r.feature.slug),
          csvEscape(r.feature.name),
          r.status,
          r.createdAt.toISOString(),
          r.activatedAt?.toISOString() ?? "",
          r.deactivatesAt?.toISOString() ?? "",
        ].join(","),
      ),
    ];
    return new NextResponse("\uFEFF" + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="feature-adoption.csv"',
      },
    });
  }

  return NextResponse.json({
    count: rows.length,
    sample: rows.slice(0, 50),
  });
}

function csvEscape(s: string) {
  const t = s.replace(/"/g, '""');
  if (/[",\n]/.test(t)) return `"${t}"`;
  return t;
}
