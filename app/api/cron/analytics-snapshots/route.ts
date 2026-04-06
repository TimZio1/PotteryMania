import { NextResponse } from "next/server";
import { writePlatformAnalyticsSnapshotForDay } from "@/lib/analytics-snapshot-populate";

export const dynamic = "force-dynamic";

/**
 * Daily platform analytics snapshot (Tier 4D). Call with Authorization: Bearer CRON_SECRET.
 * Optional ?day=YYYY-MM-DD (UTC) for backfill; default yesterday UTC.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dayParam = url.searchParams.get("day");
  let day: Date;
  if (dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam)) {
    day = new Date(`${dayParam}T12:00:00.000Z`);
  } else {
    const now = new Date();
    day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  }

  const result = await writePlatformAnalyticsSnapshotForDay(day);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, day: day.toISOString().slice(0, 10) });
}
