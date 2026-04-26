import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logApiError } from "@/lib/monitoring";
import {
  adminInboxFromAddress,
  buildThreadKey,
  defaultAdminInboxToAddress,
  inferMailbox,
  isValidEmail,
  normalizeEmailAddress,
  renderAdminInboxReplyEmail,
} from "@/lib/admin-inbox";
import { escapeHtml, sendEmailMessages } from "@/lib/email/base";

export const dynamic = "force-dynamic";

function folderWhere(folder: string) {
  if (folder === "saved") return { savedAt: { not: null }, deletedAt: null };
  if (folder === "sent") return { direction: "outbound", deletedAt: null };
  if (folder === "deleted") return { deletedAt: { not: null } };
  return { direction: "inbound", deletedAt: null };
}

export async function GET(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const folder = url.searchParams.get("folder") || "inbox";
  const mailbox = url.searchParams.get("mailbox") || "";
  const search = (url.searchParams.get("q") || "").trim();

  const where = {
    ...folderWhere(folder),
    ...(mailbox ? { mailbox } : {}),
    ...(search
      ? {
          OR: [
            { subject: { contains: search, mode: "insensitive" as const } },
            { fromEmail: { contains: search, mode: "insensitive" as const } },
            { toEmail: { contains: search, mode: "insensitive" as const } },
            { textBody: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [messages, counts] = await Promise.all([
    prisma.adminInboxMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.adminInboxMessage.groupBy({
      by: ["direction"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    counts: {
      inbox: counts.find((c) => c.direction === "inbound")?._count._all ?? 0,
      sent: counts.find((c) => c.direction === "outbound")?._count._all ?? 0,
      saved: await prisma.adminInboxMessage.count({ where: { savedAt: { not: null }, deletedAt: null } }),
      deleted: await prisma.adminInboxMessage.count({ where: { deletedAt: { not: null } } }),
      unread: await prisma.adminInboxMessage.count({
        where: { direction: "inbound", readAt: null, deletedAt: null },
      }),
    },
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      mailbox: m.mailbox,
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

export async function POST(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { toEmail?: string; subject?: string; body?: string; saveOnly?: boolean };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_inbox_send_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const toEmail = normalizeEmailAddress(body.toEmail);
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 240) : "";
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 8000) : "";
  if (!isValidEmail(toEmail)) return NextResponse.json({ error: "Valid recipient email required" }, { status: 400 });
  if (subject.length < 2) return NextResponse.json({ error: "Subject required" }, { status: 400 });
  if (text.length < 1) return NextResponse.json({ error: "Message body required" }, { status: 400 });

  const fromEmail = normalizeEmailAddress(defaultAdminInboxToAddress());
  const mailbox = inferMailbox(fromEmail, subject);
  const threadKey = buildThreadKey({ fromEmail, toEmail, subject });
  const html = renderAdminInboxReplyEmail({ body: text });

  if (!body.saveOnly) {
    await sendEmailMessages([
      {
        to: toEmail,
        subject,
        html,
        text,
        from: adminInboxFromAddress(),
        replyTo: defaultAdminInboxToAddress(),
      },
    ]);
  }

  const row = await prisma.adminInboxMessage.create({
    data: {
      direction: "outbound",
      mailbox,
      fromEmail,
      toEmail,
      subject,
      textBody: text,
      htmlBody: html,
      threadKey,
      sentByUserId: user.id,
      savedAt: body.saveOnly ? new Date() : null,
      sentAt: body.saveOnly ? null : new Date(),
    },
  });

  await prisma.adminNotification.create({
    data: {
      title: body.saveOnly ? "Email draft saved" : "Email sent",
      body: `${subject} → ${toEmail}`,
      level: "info",
      readAt: new Date(),
    },
  });

  return NextResponse.json({
    id: row.id,
    status: body.saveOnly ? "saved" : "sent",
    preview: escapeHtml(text).slice(0, 180),
  });
}
