import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { assertRateLimit } from "@/lib/rate-limit";
import { WEAR_EVENT_KIND_SET } from "@/lib/wear-event-kinds";
import { logApiError } from "@/lib/monitoring";

const META_KEY_MAX: Record<string, number> = {
  source: 120,
  path: 500,
  referrer: 500,
  utm_source: 120,
  utm_medium: 120,
  utm_campaign: 120,
  variantSku: 120,
  sessionId: 200,
  referring_studio_id: 128,
  item_count: 10,
};

/** Allowlisted `meta` keys only — blocks accidental PII in analytics payloads. */
function parseWearEventMeta(raw: unknown): Prisma.InputJsonValue | "invalid" {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return "invalid";
  const o = raw as Record<string, unknown>;
  const out: Record<string, string | number | boolean> = {};
  for (const key of Object.keys(o)) {
    const max = META_KEY_MAX[key];
    if (max === undefined) return "invalid";
    const v = o[key];
    if (typeof v === "string") {
      if (v.length > max) return "invalid";
      out[key] = v;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = v;
    } else if (typeof v === "boolean") {
      out[key] = v;
    } else {
      return "invalid";
    }
  }
  return out as Prisma.InputJsonValue;
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "wear_analytics", 120, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many events" }, { status: 429 });
  }

  let body: {
    kind?: unknown;
    productId?: unknown;
    variantId?: unknown;
    orderId?: unknown;
    meta?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = typeof body.kind === "string" ? body.kind.trim() : "";
  if (!kind || !WEAR_EVENT_KIND_SET.has(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const productId = typeof body.productId === "string" && body.productId.trim() ? body.productId.trim() : null;
  const variantId = typeof body.variantId === "string" && body.variantId.trim() ? body.variantId.trim() : null;
  const orderId = typeof body.orderId === "string" && body.orderId.trim() ? body.orderId.trim() : null;
  let payload: Prisma.InputJsonValue | undefined;
  if (body.meta !== undefined && body.meta !== null) {
    const parsed = parseWearEventMeta(body.meta);
    if (parsed === "invalid") {
      return NextResponse.json({ error: "Invalid meta (unknown or disallowed keys)" }, { status: 400 });
    }
    payload = parsed;
  }

  const user = await getSessionUser();

  try {
    await prisma.wearAnalyticsEvent.create({
      data: {
        kind,
        productId,
        variantId,
        orderId,
        userId: user?.id ?? null,
        ...(payload !== undefined ? { payload } : {}),
      },
    });
  } catch (e) {
    logApiError("wear_events_persist", e, { kind }, req);
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
