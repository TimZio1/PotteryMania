import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";
import {
  computeStudioApprovalAddonCohorts,
  studioAddonCohortsToCsv,
} from "@/lib/admin-studio-addon-cohort";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format")?.toLowerCase() ?? "json";
  const cohortsBackRaw = url.searchParams.get("cohortsBack");
  const cohortsBack =
    cohortsBackRaw && /^\d+$/.test(cohortsBackRaw) ? Math.min(36, Math.max(3, parseInt(cohortsBackRaw, 10))) : 12;

  const rows = await computeStudioApprovalAddonCohorts(cohortsBack);

  if (format === "csv") {
    const csv = studioAddonCohortsToCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="studio-addon-cohorts-${cohortsBack}m.csv"`,
      },
    });
  }

  return NextResponse.json({ cohortsBack, rows });
}
