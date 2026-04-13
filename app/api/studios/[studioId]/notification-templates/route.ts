import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import type { NotificationTemplateType } from "@prisma/client";

type Ctx = { params: Promise<{ studioId: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true, status: true },
  });
  if (!studio || studio.ownerUserId !== userId) return null;
  return studio;
}

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

export async function GET(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const templateType = normalizeTemplateType(searchParams.get("templateType"));
  const templates = await prisma.notificationTemplate.findMany({
    where: {
      studioId,
      ...(templateType ? { templateType } : {}),
    },
    orderBy: [{ templateType: "asc" }, { updatedAt: "desc" }],
    include: {
      experience: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json({ templates, templateTypes: TEMPLATE_TYPES });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const templateType = normalizeTemplateType(body.templateType);
  if (!templateType) return NextResponse.json({ error: "Invalid templateType" }, { status: 400 });
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const bodyHtml = typeof body.bodyHtml === "string" ? body.bodyHtml.trim() : "";
  if (!subject) return NextResponse.json({ error: "subject is required" }, { status: 400 });
  if (!bodyHtml) return NextResponse.json({ error: "bodyHtml is required" }, { status: 400 });
  const experienceId = typeof body.experienceId === "string" && body.experienceId.trim() ? body.experienceId.trim() : null;

  if (experienceId) {
    const exp = await prisma.experience.findFirst({
      where: { id: experienceId, studioId },
      select: { id: true },
    });
    if (!exp) return NextResponse.json({ error: "Invalid experienceId for this studio" }, { status: 400 });
  }

  const template = await prisma.notificationTemplate.create({
    data: {
      studioId,
      templateType,
      experienceId,
      subject,
      bodyHtml,
      isActive: body.isActive !== false,
    },
    include: {
      experience: { select: { id: true, title: true } },
    },
  });
  return NextResponse.json({ template }, { status: 201 });
}
