import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Liveness + DB ping; optional Stripe reachability when configured. */
export async function GET(req: Request) {
  const secret = process.env.HEALTHCHECK_SECRET?.trim();
  const wantsDetailed = Boolean(secret) && req.headers.get("x-healthcheck-secret") === secret;
  const body: Record<string, unknown> = { ok: true };
  let ok = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    body.db = "ok";
  } catch (e) {
    ok = false;
    if (wantsDetailed) {
      body.db = "error";
      body.dbError = e instanceof Error ? e.message : "unknown";
    }
  }

  if (process.env.STRIPE_SECRET_KEY) {
    try {
      await getStripe().balance.retrieve();
      body.stripe = "ok";
    } catch (e) {
      ok = false;
      if (wantsDetailed) {
        body.stripe = "error";
        body.stripeError = e instanceof Error ? e.message : "unknown";
      }
    }
  }

  if (wantsDetailed) {
    const scKey = process.env.SPREADCONNECT_API_KEY?.trim() ?? "";
    if (scKey === "__PENDING__") {
      body.spreadconnect = "pending_placeholder";
    } else if (!scKey) {
      body.spreadconnect = "missing";
    } else {
      body.spreadconnect = "configured";
    }
  }

  body.ok = ok;
  if (!wantsDetailed) {
    return NextResponse.json({ ok }, { status: ok ? 200 : 503 });
  }
  return NextResponse.json(body, { status: ok ? 200 : 503 });
}
