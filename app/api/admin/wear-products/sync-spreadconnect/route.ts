import { NextResponse } from "next/server";
import { requireHyperAdminUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await req.text().catch(() => "");
  return NextResponse.json(
    {
      error: "Manual Spreadconnect catalog sync is disabled.",
      hint: "The admin catalog reads saved database products only. Use GET /api/cron/wear-catalog-sync from the scheduled job with CRON_SECRET for the daily refresh.",
    },
    { status: 409 },
  );
}
