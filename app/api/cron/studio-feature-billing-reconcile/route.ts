import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { logCronRun } from "@/lib/cron-audit";
import { reconcileStudioFeatureSubscriptionsWithStripe } from "@/lib/studio-feature-billing";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = new URL(req.url).searchParams.get("limit");
  const parsed = limitParam ? Number(limitParam) : NaN;
  const result = await reconcileStudioFeatureSubscriptionsWithStripe(
    Number.isFinite(parsed) && parsed > 0 ? { limit: Math.floor(parsed) } : undefined,
  );
  void logCronRun("studio-feature-billing-reconcile", { ok: true, ...result });
  return NextResponse.json({ ok: true as const, ...result });
}
