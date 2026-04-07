import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { logCronRun } from "@/lib/cron-audit";
import { runRankingScoreUpdate } from "@/lib/ranking/score-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
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
