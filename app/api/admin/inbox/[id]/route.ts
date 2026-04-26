import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const message = await prisma.adminInboxMessage.update({
    where: { id },
    data: { readAt: new Date() },
  });

  const thread = message.threadKey
    ? await prisma.adminInboxMessage.findMany({
        where: { threadKey: message.threadKey },
        orderBy: { createdAt: "asc" },
        take: 50,
      })
    : [message];

  return NextResponse.json({
    message,
    thread: thread.map((m) => ({
      id: m.id,
      direction: m.direction,
      fromEmail: m.fromEmail,
      fromName: m.fromName,
      toEmail: m.toEmail,
      subject: m.subject,
      textBody: m.textBody,
      htmlBody: m.htmlBody,
      readAt: m.readAt?.toISOString() ?? null,
      savedAt: m.savedAt?.toISOString() ?? null,
      deletedAt: m.deletedAt?.toISOString() ?? null,
      sentAt: m.sentAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  let body: { action?: string };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_inbox_patch_invalid_json", e, { id }, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const now = new Date();
  const action = body.action;
  const data =
    action === "save"
      ? { savedAt: now }
      : action === "unsave"
        ? { savedAt: null }
        : action === "delete"
          ? { deletedAt: now }
          : action === "restore"
            ? { deletedAt: null }
            : action === "read"
              ? { readAt: now }
              : null;

  if (!data) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const updated = await prisma.adminInboxMessage.update({ where: { id }, data });
  return NextResponse.json({
    ok: true,
    message: {
      id: updated.id,
      readAt: updated.readAt?.toISOString() ?? null,
      savedAt: updated.savedAt?.toISOString() ?? null,
      deletedAt: updated.deletedAt?.toISOString() ?? null,
    },
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  await prisma.adminInboxMessage.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
