import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { logCronRun } from "@/lib/cron-audit";
import { runWearFulfillmentJobsOnce } from "@/lib/wear-fulfillment-worker";

export const dynamic = "force-dynamic";

const DEFAULT_BATCH = 8;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = new URL(req.url).searchParams.get("limit");
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_BATCH;
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : DEFAULT_BATCH;

  try {
    const summary = await runWearFulfillmentJobsOnce(limit);
    void logCronRun("wear-fulfillment-jobs", summary);
    return NextResponse.json({ ok: true as const, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    void logCronRun("wear-fulfillment-jobs", { ok: false, error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
