import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/db";
import { logCronRun } from "@/lib/cron-audit";
import { sendEmailMessages } from "@/lib/email/base";
import { bookSoonCopy } from "@/lib/email/booking-notify";
import { renderTemplateVariables, resolveNotificationTemplate } from "@/lib/email/notification-template";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

function siteOrigin() {
  return resolvePublicSiteUrl();
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rules = await prisma.bookSoonRule.findMany({
      where: { isActive: true },
      select: {
        id: true,
        studioId: true,
        name: true,
        daysAfterVisit: true,
        emailSubject: true,
        emailBody: true,
        experienceIds: true,
        studio: { select: { displayName: true } },
      },
    });

    let sent = 0;
    let failed = 0;
    const origin = siteOrigin();

    for (const rule of rules) {
      const now = Date.now();
      const windowEnd = new Date(now - rule.daysAfterVisit * 24 * 60 * 60 * 1000);
      const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);

      const bookings = await prisma.booking.findMany({
        where: {
          studioId: rule.studioId,
          bookingStatus: "completed",
          slot: { slotDate: { gte: windowStart, lt: windowEnd } },
          ...(rule.experienceIds.length > 0 ? { experienceId: { in: rule.experienceIds } } : {}),
          customerUserId: { not: null },
          customerUser: { marketingConsent: true },
        },
        select: {
          id: true,
          experienceId: true,
          customerName: true,
          customerEmail: true,
          customerUserId: true,
          experience: { select: { title: true } },
          slot: { select: { slotDate: true } },
        },
        take: 200,
      });

      for (const booking of bookings) {
        if (!booking.customerUserId) continue;
        const alreadySent = await prisma.bookSoonSent.findUnique({
          where: {
            ruleId_bookingId: {
              ruleId: rule.id,
              bookingId: booking.id,
            },
          },
          select: { id: true },
        });
        if (alreadySent) continue;

        try {
          const vars = {
            customerName: booking.customerName,
            studioName: rule.studio.displayName,
            className: booking.experience.title,
            lastVisitDate: booking.slot.slotDate.toISOString().slice(0, 10),
            daysAfterVisit: String(rule.daysAfterVisit),
          };
          const template = await resolveNotificationTemplate({
            studioId: rule.studioId,
            templateType: "book_soon",
            experienceId: booking.experienceId,
          });
          const subject = renderTemplateVariables(template?.subject ?? rule.emailSubject, vars);
          const body = renderTemplateVariables(template?.bodyHtml ?? rule.emailBody, vars);
          await sendEmailMessages([
            {
              to: booking.customerEmail,
              subject,
              html: bookSoonCopy({
                customerName: booking.customerName,
                subject,
                bodyHtml: body,
                ctaUrl: `${origin}/classes`,
              }),
            },
          ]);
          await prisma.bookSoonSent.create({
            data: {
              ruleId: rule.id,
              bookingId: booking.id,
              userId: booking.customerUserId,
              sentAt: new Date(),
            },
          });
          sent += 1;
        } catch {
          failed += 1;
        }
      }
    }

    const body = { ok: true as const, sent, failed, rules: rules.length };
    void logCronRun("book-soon-notify", body);
    return NextResponse.json(body, { status: failed > 0 ? 207 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    void logCronRun("book-soon-notify", { ok: false, error: message });
    return NextResponse.json({ ok: false, error: "Book soon notifications failed", message }, { status: 500 });
  }
}
