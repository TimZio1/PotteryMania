/**
 * Operator-facing alerts for the wear order lifecycle.
 *
 * Two surfaces, fired together so an operator never has to refresh a dashboard to find out
 * a sale happened or a charge failed:
 *   1. Email to `wearOpsAlertInbox()` (same chain as the Spreadconnect escalation alerts)
 *   2. Row inserted into `AdminInboxMessage` so /admin/notifications shows an unread badge
 *
 * Spreadconnect submit failures are handled separately by `escalateWearOrderSpreadconnectFailure`.
 */
import { prisma } from "@/lib/db";
import { escapeHtml, renderEmailShell, sendEmailMessages } from "@/lib/email/base";
import { wearOpsAlertInbox } from "@/lib/wear-order-escalate";
import { resolveBackofficeSiteUrl } from "@/lib/public-site-url";
import { logApiError } from "@/lib/monitoring";
import { adminInboxFromAddress, defaultAdminInboxToAddress, buildThreadKey } from "@/lib/admin-inbox";

type WearOrderOperatorAlertKind = "new_order" | "payment_failed";

function shortRef(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/**
 * Fire-and-forget operator alert. Same shape as `scheduleWearOrderNotification` so
 * webhook handlers don't pay latency for a non-critical side-effect.
 */
export function scheduleWearOrderOperatorAlert(
  kind: WearOrderOperatorAlertKind,
  orderId: string,
  context?: Record<string, unknown>,
): void {
  void sendWearOrderOperatorAlert(kind, orderId, context).catch((e) =>
    logApiError("wear_order_operator_alert", e, { kind, orderId }),
  );
}

export async function sendWearOrderOperatorAlert(
  kind: WearOrderOperatorAlertKind,
  orderId: string,
  context?: Record<string, unknown>,
): Promise<void> {
  const order = await prisma.wearOrder.findUnique({
    where: { id: orderId },
    include: { items: true, coupon: { select: { code: true } } },
  });
  if (!order) return;

  const ref = shortRef(order.id);
  const adminUrl = `${resolveBackofficeSiteUrl()}/admin/wear-orders/${order.id}`;
  const totalCents = order.amountTotalCents ?? order.subtotalCents;
  const total = `${(totalCents / 100).toFixed(2)} ${order.currency.toUpperCase()}`;
  const itemsCount = order.items.reduce((sum, it) => sum + (it.quantity ?? 0), 0);
  const itemsList = order.items
    .map(
      (it) =>
        `${it.productNameSnapshot}${it.variantLabelSnapshot ? ` (${it.variantLabelSnapshot})` : ""} × ${it.quantity}`,
    )
    .join(" · ");

  const baseFacts = [
    `Order ${ref} (${order.id})`,
    `Total: ${total}`,
    `Items: ${itemsCount}`,
    `Customer: ${order.customerName} <${order.customerEmail}>`,
    order.coupon ? `Coupon: ${order.coupon.code} (-${(order.discountCents / 100).toFixed(2)} ${order.currency.toUpperCase()})` : null,
    context && Object.keys(context).length ? `Context: ${JSON.stringify(context)}` : null,
  ]
    .filter((line): line is string => !!line);

  const factsHtml = baseFacts.map((line) => `<p style="margin:0 0 6px;">${escapeHtml(line)}</p>`).join("");
  const itemsHtml = itemsList
    ? `<p style="margin:14px 0 0;font-size:13px;color:#5f5045;">${escapeHtml(itemsList)}</p>`
    : "";
  const ctaHtml = `<p style="margin:18px 0 0;"><a href="${escapeHtml(adminUrl)}">${escapeHtml(adminUrl)}</a></p>`;

  const adminEmail = wearOpsAlertInbox();
  const inboxToEmail = defaultAdminInboxToAddress();
  const fromAddress = adminInboxFromAddress();

  if (kind === "new_order") {
    const subject = `[Wear] New order ${ref} — ${total}`;
    const html = renderEmailShell({
      eyebrow: "Operations · New order",
      title: `New wear order — ${total}`,
      intro: `${order.customerName} just paid. Order #${ref} is in motion.`,
      bodyHtml: `${factsHtml}${itemsHtml}${ctaHtml}`,
    });

    if (adminEmail) {
      await sendEmailMessages([{ to: adminEmail, subject, html }]);
    }

    await upsertAdminInboxRow({
      providerMessageId: `wear-order-new-${order.id}`,
      subject,
      fromAddress,
      toEmail: inboxToEmail,
      bodyText: baseFacts.join("\n") + (itemsList ? `\n\nItems:\n${itemsList}` : "") + `\n\n${adminUrl}`,
      bodyHtml: html,
      mailbox: "orders",
    });
    return;
  }

  if (kind === "payment_failed") {
    const subject = `[Wear] Payment failed ${ref} — ${total}`;
    const html = renderEmailShell({
      eyebrow: "Operations · Payment failed",
      title: `Wear payment failed — ${total}`,
      intro: `Stripe rejected the charge on order #${ref}. The customer was emailed.`,
      bodyHtml: `${factsHtml}${itemsHtml}${ctaHtml}`,
    });

    if (adminEmail) {
      await sendEmailMessages([{ to: adminEmail, subject, html }]);
    }

    await upsertAdminInboxRow({
      providerMessageId: `wear-order-payment-failed-${order.id}`,
      subject,
      fromAddress,
      toEmail: inboxToEmail,
      bodyText: baseFacts.join("\n") + (itemsList ? `\n\nItems:\n${itemsList}` : "") + `\n\n${adminUrl}`,
      bodyHtml: html,
      mailbox: "orders",
    });
    return;
  }
}

/**
 * Idempotent inbox row writer — `providerMessageId` carries the wear order id so re-emitting
 * an alert (Stripe webhook retry, manual replay) doesn't create duplicate entries.
 */
async function upsertAdminInboxRow(input: {
  providerMessageId: string;
  subject: string;
  fromAddress: string;
  toEmail: string;
  bodyText: string;
  bodyHtml: string;
  mailbox: string;
}) {
  const fromEmailMatch = input.fromAddress.match(/<([^>]+)>/);
  const fromEmail = (fromEmailMatch?.[1] || input.fromAddress).trim();
  const fromName = input.fromAddress.replace(/<[^>]+>/, "").replace(/^"|"$/g, "").trim() || null;
  const threadKey = buildThreadKey({ fromEmail, toEmail: input.toEmail, subject: input.subject });

  await prisma.adminInboxMessage.upsert({
    where: { providerMessageId: input.providerMessageId },
    create: {
      direction: "inbound",
      mailbox: input.mailbox,
      fromEmail,
      fromName,
      toEmail: input.toEmail,
      subject: input.subject,
      textBody: input.bodyText,
      htmlBody: input.bodyHtml,
      providerMessageId: input.providerMessageId,
      threadKey,
    },
    update: {},
  });
}
