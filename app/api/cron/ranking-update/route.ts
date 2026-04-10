import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { logCronRun } from "@/lib/cron-audit";
import { runRankingScoreUpdate } from "@/lib/ranking/score-engine";
import { isRuntimeFlagEnabled, RUNTIME_FLAG_KEYS } from "@/lib/runtime-feature-flags";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rankingEnabled = await isRuntimeFlagEnabled(RUNTIME_FLAG_KEYS.rankingUpdateEnabled, false);
  if (!rankingEnabled) {
    void logCronRun("ranking-update", { ok: false, disabled: true });
    return NextResponse.json(
      { ok: false, error: "Ranking update is disabled" },
      { status: 503 },
    );
  }

  try {
    const result = await runRankingScoreUpdate();
    void logCronRun("ranking-update", {
      ok: true,
      studiosProcessed: result.studiosProcessed,
      scoresDeletedNonApproved: result.scoresDeletedNonApproved,
      durationMs: result.durationMs,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    void logCronRun("ranking-update", { ok: false, error: message });
    return NextResponse.json({ ok: false, error: "Ranking update failed", message }, { status: 500 });
  }
}
