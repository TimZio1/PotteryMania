import { NextResponse } from "next/server";

/**
 * Deploy / load-balancer readiness: HTTP 200 with no DB or external calls.
 * Use as Railway `healthcheckPath` so slow Postgres or a heavy `/` page does not fail the replica.
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({ ok: true, service: "potterymania" }, { status: 200 });
}
