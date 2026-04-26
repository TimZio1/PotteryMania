import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logApiError } from "@/lib/monitoring";
import {
  buildThreadKey,
  inferMailbox,
  normalizeEmailAddress,
  normalizeEmailName,
} from "@/lib/admin-inbox";

export const dynamic = "force-dynamic";

function pickFirstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function parsePayload(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const parsed = await req.json();
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  }
  const form = await req.formData();
  return Object.fromEntries(form.entries());
}

export async function POST(req: Request) {
  const configuredSecret = process.env.ADMIN_INBOX_WEBHOOK_SECRET?.trim();
  if (configuredSecret) {
    const headerSecret =
      req.headers.get("x-admin-inbox-secret") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (headerSecret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = await parsePayload(req);
  } catch (e) {
    logApiError("admin_inbox_webhook_invalid_payload", e, undefined, req);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const fromRaw = pickFirstString(payload, ["from", "fromEmail", "sender", "From"]);
  const toRaw = pickFirstString(payload, ["to", "toEmail", "recipient", "To"]);
  const subject = pickFirstString(payload, ["subject", "Subject"]).slice(0, 240) || "(no subject)";
  const textBody = pickFirstString(payload, ["text", "textBody", "plain", "body", "TextBody"]) || null;
  const htmlBody = pickFirstString(payload, ["html", "htmlBody", "HtmlBody"]) || null;
  const providerMessageId =
    pickFirstString(payload, ["messageId", "Message-Id", "message_id", "id", "resendEmailId"]) || null;

  const fromEmail = normalizeEmailAddress(fromRaw);
  const toEmail = normalizeEmailAddress(toRaw) || "support@potterymania.com";
  if (!fromEmail) {
    return NextResponse.json({ error: "from email required" }, { status: 400 });
  }

  const mailbox = inferMailbox(toEmail, subject);
  const threadKey = buildThreadKey({ fromEmail, toEmail, subject });

  try {
    const row = await prisma.adminInboxMessage.upsert({
      where: {
        providerMessageId: providerMessageId || `manual-${crypto.randomUUID()}`,
      },
      update: {},
      create: {
        direction: "inbound",
        mailbox,
        fromEmail,
        fromName: normalizeEmailName(fromRaw),
        toEmail,
        subject,
        textBody,
        htmlBody,
        providerMessageId,
        threadKey,
      },
    });

    await prisma.adminNotification.create({
      data: {
        title: `New ${mailbox} email`,
        body: `${fromEmail}: ${subject}`,
        level: "info",
      },
    });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    logApiError("admin_inbox_webhook_store_failed", e, { fromEmail, toEmail }, req);
    return NextResponse.json({ error: "Store failed" }, { status: 500 });
  }
}
