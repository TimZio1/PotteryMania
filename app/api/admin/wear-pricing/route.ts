import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";
import {
  resolveWearGlobalPricing,
  updateWearGlobalPricing,
} from "@/lib/wear-commission";
import {
  resolveWearInternalPricingConfig,
  saveWearInternalPricingConfig,
} from "@/lib/wear-internal-pricing";

export async function GET() {
  if (!(await requireAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [affiliate, retail] = await Promise.all([
    resolveWearGlobalPricing(),
    resolveWearInternalPricingConfig(),
  ]);
  return NextResponse.json({ ...affiliate, retail });
}

export async function PATCH(req: Request) {
  if (!(await requireAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.defaultMarginBps === "number") patch.defaultMarginBps = Math.round(Math.max(0, body.defaultMarginBps));
  if (typeof body.minMarginBps === "number") patch.minMarginBps = Math.round(Math.max(0, body.minMarginBps));
  if (typeof body.maxMarginBps === "number") patch.maxMarginBps = Math.round(Math.max(0, body.maxMarginBps));
  if (typeof body.marginLocked === "boolean") patch.marginLocked = body.marginLocked;

  const [affiliate, retail] = await Promise.all([
    updateWearGlobalPricing(patch),
    body.retail && typeof body.retail === "object"
      ? saveWearInternalPricingConfig(body.retail as Parameters<typeof saveWearInternalPricingConfig>[0])
      : resolveWearInternalPricingConfig(),
  ]);
  return NextResponse.json({ ...affiliate, retail });
}
