import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";
import { computeCohortRetention } from "@/lib/admin-cohort-retention";

export const dynamic = "force-dynamic";

function escapeCsv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "json";
  const rows = await computeCohortRetention({ cohortsBack: 6, horizon: 4 });

  if (format === "csv") {
    const header = ["cohortMonth", "signupCount", "m0_pct", "m1_pct", "m2_pct", "m3_pct"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.cohortMonth,
          String(r.signupCount),
          ...r.retention.map((x) => (x * 100).toFixed(1)),
        ]
          .map(escapeCsv)
          .join(","),
      ),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="cohort-retention.csv"',
      },
    });
  }

  return NextResponse.json({ rows });
}
