import { NextResponse } from "next/server";
import { logCronRun } from "@/lib/cron-audit";
import { runRankingScoreUpdate } from "@/lib/ranking/score-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runRankingScoreUpdate();
  void logCronRun("ranking-update", {
    ok: true,
    studiosProcessed: result.studiosProcessed,
    scoresDeletedNonApproved: result.scoresDeletedNonApproved,
    durationMs: result.durationMs,
  });

  return NextResponse.json(result);
}
