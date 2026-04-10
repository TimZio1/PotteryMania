import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { reconcilePendingStudioCalendarSyncs } from "@/lib/calendar/reconcile-studio-calendar";
import { logCronRun } from "@/lib/cron-audit";

export const dynamic = "force-dynamic";

/**
 * Retries Google Calendar push for confirmed bookings missing `googleCalendarEventId`
 * while the studio has an active connection. Call with `Authorization: Bearer CRON_SECRET`.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 40));

  try {
    const result = await reconcilePendingStudioCalendarSyncs(limit);
    void logCronRun("calendar-sync-reconcile", { ok: true, ...result, limit });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    void logCronRun("calendar-sync-reconcile", { ok: false, error: msg, limit });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
