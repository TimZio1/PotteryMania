import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await requireHyperAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "failed";
  const take = Math.min(100, Math.max(1, Number(searchParams.get("take") ?? "50") || 50));

  if (status === "failed") {
    const tasks = await prisma.stripeWebhookEventTask.findMany({
      where: { failedAt: { not: null }, resolvedAt: null },
      include: { event: true },
      orderBy: { failedAt: "desc" },
      take,
    });
    return NextResponse.json({ tasks });
  }

  const events = await prisma.stripeWebhookEvent.findMany({
    orderBy: { receivedAt: "desc" },
    take,
    include: { tasks: { orderBy: { failedAt: "desc" } } },
  });
  return NextResponse.json({ events });
}

export async function PATCH(req: Request) {
  const admin = await requireHyperAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { taskId?: string };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_webhook_events_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  await prisma.stripeWebhookEventTask.update({
    where: { id: taskId },
    data: { resolvedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
