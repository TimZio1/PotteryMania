import { prisma } from "@/lib/db";
import { renderEmailShell, escapeHtml, sendEmailMessages } from "@/lib/email/base";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

/**
 * After a cancellation frees capacity on a slot, notify active waitlist entries
 * that a spot has opened up. Updates their status to "notified".
 *
 * Inspired by SimplyBook.me's automatic waitlist notification system:
 * when a slot goes from full → open, everyone on the waitlist for that slot
 * gets a "Book now — a spot just opened" email.
 */
export async function notifyWaitlistOnCapacityRelease(slotId: string): Promise<number> {
  const slot = await prisma.bookingSlot.findUnique({
    where: { id: slotId },
    include: {
      experience: { select: { id: true, title: true } },
    },
  });
  if (!slot || slot.status === "full") return 0;

  const entries = await prisma.bookingWaitlistEntry.findMany({
    where: { slotId, status: "active" },
    orderBy: { createdAt: "asc" },
  });
  if (entries.length === 0) return 0;

  const siteUrl = resolvePublicSiteUrl();
  const classUrl = `${siteUrl}/classes/${slot.experienceId}`;
  const dateStr = slot.slotDate.toISOString().slice(0, 10);
  const timeStr = slot.startTime || "";
  const spotsAvailable = slot.capacityTotal - slot.capacityReserved;

  const messages = entries.map((entry) => ({
    to: entry.customerEmail,
    subject: `A spot opened up for ${slot.experience.title}`,
    html: renderEmailShell({
      eyebrow: "Waitlist update",
      title: "A spot just opened up!",
      intro: `Great news, ${escapeHtml(entry.customerName)}! A place is now available for the class you were waiting for.`,
      bodyHtml: `
        <p style="margin:0 0 8px;">Class: <strong>${escapeHtml(slot.experience.title)}</strong></p>
        <p style="margin:0 0 8px;">Date: ${escapeHtml(dateStr)}${timeStr ? ` at ${escapeHtml(timeStr)}` : ""}</p>
        <p style="margin:0 0 8px;">Spots available: ${spotsAvailable}</p>
        <p style="margin:16px 0 0;">Spots fill up fast — book now before someone else takes it.</p>
      `,
      ctaLabel: "Book now",
      ctaUrl: classUrl,
    }),
  }));

  try {
    await sendEmailMessages(messages);
  } catch {
    // Don't let email failures break the cancellation flow
    return 0;
  }

  await prisma.bookingWaitlistEntry.updateMany({
    where: {
      id: { in: entries.map((e) => e.id) },
    },
    data: { status: "notified" },
  });

  return entries.length;
}
