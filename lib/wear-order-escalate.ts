import { prisma } from "@/lib/db";
import { escapeHtml, renderEmailShell, sendEmailMessages } from "@/lib/email/base";

export function wearOpsAlertInbox(): string | null {
  const a = process.env.WEAR_OPS_ALERT_EMAIL?.trim();
  if (a) return a;
  const b = process.env.EARLY_ACCESS_NOTIFY_EMAIL?.trim();
  if (b) return b;
  const c = process.env.HYPERADMIN_ALERT_EMAIL?.trim();
  if (c) return c;
  const d = process.env.SEED_HYPER_ADMIN_EMAIL?.trim();
  if (d) return d;
  return null;
}

/**
 * Paid order only: move to manual_review, append note, notify customer + ops inbox.
 * No-op if order is not `paid` (e.g. already escalated or replay).
 */
export async function escalateWearOrderSpreadconnectFailure(opts: {
  wearOrderId: string;
  customerEmail: string;
  customerName: string;
  reasonCode: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const noteLine = `[${new Date().toISOString()}] Spreadconnect failure → manual_review (${opts.reasonCode})`;
  let didEscalate = false;
  await prisma.$transaction(async (tx) => {
    const o = await tx.wearOrder.findUnique({
      where: { id: opts.wearOrderId },
      select: { status: true, internalNotes: true },
    });
    if (!o || o.status !== "paid") return;
    await tx.wearOrder.update({
      where: { id: opts.wearOrderId },
      data: {
        status: "manual_review",
        internalNotes: [o.internalNotes, noteLine].filter(Boolean).join("\n"),
      },
    });
    didEscalate = true;
  });
  if (!didEscalate) return;

  const admin = wearOpsAlertInbox();
  const site =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "https://potterymania.com";
  const adminUrl = `${site.replace(/\/+$/, "")}/admin/wear-orders/${opts.wearOrderId}`;
  const detailStr = opts.detail
    ? escapeHtml(JSON.stringify(opts.detail, null, 2).slice(0, 2000))
    : "";
  const firstName = opts.customerName.trim().split(/\s+/)[0] || "there";

  const messages: { to: string; subject: string; html: string }[] = [
    {
      to: opts.customerEmail,
      subject: "Your PotteryMania shop order — we're on it",
      html: renderEmailShell({
        eyebrow: "Order update",
        title: "We're processing your order manually",
        intro: `Hi ${firstName}, your payment went through, but our fulfilment partner couldn't accept the order automatically. Our team will submit or fulfil it manually and email you when it ships.`,
        bodyHtml:
          "<p style=\"margin:0;\">You don't need to do anything right now. If you have questions, reply to this email.</p>",
        footerNote: "PotteryMania shop — ceramic community merch.",
      }),
    },
  ];

  if (admin) {
    messages.push({
      to: admin,
      subject: `[Wear] Manual review required — ${opts.wearOrderId.slice(0, 8)}`,
      html: renderEmailShell({
        eyebrow: "Operations",
        title: "Spreadconnect submit failed",
        intro: `Order ${opts.wearOrderId} moved to manual_review (${opts.reasonCode}).`,
        bodyHtml: `<p><a href="${escapeHtml(adminUrl)}">${escapeHtml(adminUrl)}</a></p>${
          detailStr ? `<pre style="font-size:12px;white-space:pre-wrap;">${detailStr}</pre>` : ""
        }`,
      }),
    });
  }

  await sendEmailMessages(messages);
}
