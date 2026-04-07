import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Liveness + DB ping; optional Stripe reachability when configured. */
export async function GET() {
  const t = Date.now();
  const body: Record<string, unknown> = { ok: true, t };
  let ok = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    body.db = "ok";
  } catch (e) {
    ok = false;
    body.db = "error";
    body.dbError = e instanceof Error ? e.message : "unknown";
  }

  if (process.env.STRIPE_SECRET_KEY) {
    try {
      await getStripe().balance.retrieve();
      body.stripe = "ok";
    } catch (e) {
      ok = false;
      body.stripe = "error";
      body.stripeError = e instanceof Error ? e.message : "unknown";
    }
  } else {
    body.stripe = "skipped";
  }

  const scKey = process.env.SPREADCONNECT_API_KEY?.trim() ?? "";
  if (scKey === "__PENDING__") {
    body.spreadconnect = "pending_placeholder";
  } else if (!scKey) {
    body.spreadconnect = "missing";
  } else {
    body.spreadconnect = "configured";
  }

  body.ok = ok;
  return NextResponse.json(body, { status: ok ? 200 : 503 });
}
