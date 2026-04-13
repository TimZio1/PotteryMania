import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/db";
import { logCronRun } from "@/lib/cron-audit";
import { renderEmailShell, sendEmailMessages } from "@/lib/email/base";
import { reviewRequestCopy } from "@/lib/email/booking-notify";
import { renderTemplateVariables, resolveNotificationTemplate } from "@/lib/email/notification-template";

function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const since = new Date(Date.now() - 30 * 60 * 60 * 1000);
    const until = new Date(Date.now() - 18 * 60 * 60 * 1000);
    const candidates = await prisma.booking.findMany({
      where: {
        bookingStatus: "completed",
        reviewRequestSentAt: null,
        customerEmail: { not: "" },
        slot: { slotDate: { gte: since, lte: until } },
      },
      orderBy: { createdAt: "asc" },
      include: {
        experience: { select: { title: true } },
        studio: { select: { displayName: true } },
      },
      take: 150,
    });

    let sent = 0;
    let failed = 0;
    const origin = siteOrigin();

    for (const booking of candidates) {
      try {
        const reviewUrl = `${origin}/reviews/new?booking=${encodeURIComponent(booking.id)}`;
        const template = await resolveNotificationTemplate({
          studioId: booking.studioId,
          templateType: "review_request",
          experienceId: booking.experienceId,
        });
        const vars = {
          customerName: booking.customerName,
          className: booking.experience.title,
          studioName: booking.studio.displayName,
          reviewUrl,
        };
        const subject = template
          ? renderTemplateVariables(template.subject, vars)
          : `How was your ${booking.experience.title} session?`;
        const html = template
          ? renderEmailShell({
              eyebrow: "How was your session?",
              title: subject,
              intro: `Thanks for attending ${booking.experience.title} at ${booking.studio.displayName}.`,
              bodyHtml: renderTemplateVariables(template.bodyHtml, vars),
              ctaLabel: "Leave a review",
              ctaUrl: reviewUrl,
            })
          : reviewRequestCopy({
              customerName: booking.customerName,
              experienceTitle: booking.experience.title,
              studioName: booking.studio.displayName,
              reviewUrl,
            });
        await sendEmailMessages([
          {
            to: booking.customerEmail,
            subject,
            html,
          },
        ]);

        await prisma.booking.update({
          where: { id: booking.id },
          data: { reviewRequestSentAt: new Date() },
        });
        sent += 1;
      } catch {
        failed += 1;
      }
    }

    const body = { ok: true as const, sent, failed, candidates: candidates.length };
    void logCronRun("review-requests", body);
    return NextResponse.json(body, { status: failed > 0 ? 207 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    void logCronRun("review-requests", { ok: false, error: message });
    return NextResponse.json({ ok: false, error: "Review requests failed", message }, { status: 500 });
  }
}
