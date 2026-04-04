import { NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance/admin-guard";
import { runPricingSimulation, type ScenarioInputs } from "@/lib/finance/simulate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await requireFinanceAdmin();
  if (!g.ok) return g.response;

  let body: ScenarioInputs;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, outputs } = await runPricingSimulation(body, g.user.id);
  return NextResponse.json({ id, outputs });
}
