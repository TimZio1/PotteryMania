import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { assertRateLimit } from "@/lib/rate-limit";
import { WEAR_EVENT_KIND_SET } from "@/lib/wear-event-kinds";

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
  const payloadRaw =
    body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
      ? (body.meta as Record<string, unknown>)
      : undefined;
  const payload: Prisma.InputJsonValue | undefined = payloadRaw
    ? (JSON.parse(JSON.stringify(payloadRaw)) as Prisma.InputJsonValue)
    : undefined;

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
    console.error("[wear/events]", e);
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
