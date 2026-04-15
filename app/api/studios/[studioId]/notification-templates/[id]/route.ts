import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";
import type { NotificationTemplateType } from "@prisma/client";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

const TEMPLATE_TYPES: NotificationTemplateType[] = [
  "booking_confirmation",
  "booking_reminder",
  "booking_cancellation",
  "booking_rescheduled",
  "review_request",
  "book_soon",
];

function normalizeTemplateType(raw: unknown): NotificationTemplateType | null {
  if (typeof raw !== "string") return null;
  return TEMPLATE_TYPES.includes(raw as NotificationTemplateType) ? (raw as NotificationTemplateType) : null;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { status: true },
  });
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  const existing = await prisma.notificationTemplate.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    templateType?: NotificationTemplateType;
    subject?: string;
    bodyHtml?: string;
    experienceId?: string | null;
    isActive?: boolean;
  } = {};

  if ("templateType" in body) {
    const templateType = normalizeTemplateType(body.templateType);
    if (!templateType) return NextResponse.json({ error: "Invalid templateType" }, { status: 400 });
    data.templateType = templateType;
  }
  if ("subject" in body) {
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    if (!subject) return NextResponse.json({ error: "subject cannot be empty" }, { status: 400 });
    data.subject = subject;
  }
  if ("bodyHtml" in body) {
    const bodyHtml = typeof body.bodyHtml === "string" ? body.bodyHtml.trim() : "";
    if (!bodyHtml) return NextResponse.json({ error: "bodyHtml cannot be empty" }, { status: 400 });
    data.bodyHtml = bodyHtml;
  }
  if ("experienceId" in body) {
    const experienceId = typeof body.experienceId === "string" && body.experienceId.trim() ? body.experienceId.trim() : null;
    if (experienceId) {
      const exp = await prisma.experience.findFirst({
        where: { id: experienceId, studioId },
        select: { id: true },
      });
      if (!exp) return NextResponse.json({ error: "Invalid experienceId for this studio" }, { status: 400 });
    }
    data.experienceId = experienceId;
  }
  if ("isActive" in body) data.isActive = body.isActive === true;

  const template = await prisma.notificationTemplate.update({
    where: { id },
    data,
    include: { experience: { select: { id: true, title: true } } },
  });
  return NextResponse.json({ template });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { status: true },
  });
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  const existing = await prisma.notificationTemplate.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.notificationTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
