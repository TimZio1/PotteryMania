import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";
import { getRankingScoreWeights, setRankingScoreWeights } from "@/lib/ranking-weights-config";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const w = await getRankingScoreWeights();
  return NextResponse.json(w);
}

export async function PATCH(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { performance?: number; activity?: number; manual?: number; reason?: string };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_ranking_weights_patch_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3) return NextResponse.json({ error: "reason required (min 3 chars)" }, { status: 400 });

  const clamp = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : NaN;
  const performance = clamp(body.performance);
  const activity = clamp(body.activity);
  const manual = clamp(body.manual);
  if ([performance, activity, manual].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "performance, activity, manual must be numbers in [0,1]" }, { status: 400 });
  }

  await setRankingScoreWeights({ performance, activity, manual }, user.id);
  return NextResponse.json({ ok: true });
}
