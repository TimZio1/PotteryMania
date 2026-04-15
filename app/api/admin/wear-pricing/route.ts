import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";
import {
  resolveWearGlobalPricing,
  updateWearGlobalPricing,
} from "@/lib/wear-commission";

export async function GET() {
  if (!(await requireAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = await resolveWearGlobalPricing();
  return NextResponse.json(config);
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

  const config = await updateWearGlobalPricing(patch);
  return NextResponse.json(config);
}
