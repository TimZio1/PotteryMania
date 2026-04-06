import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { findActivatableBusinessTemplate } from "@/lib/business-templates";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string }> };

function snapshotFromStudio(slug: string | null, at: Date | null) {
  return {
    businessTemplateSlug: slug,
    businessTemplateActivatedAt: at ? at.toISOString() : null,
  };
}

/** Studio owner: activate / switch business template (instant persist + audit log + funnel event). */
export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  let body: { templateSlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const templateSlug = typeof body.templateSlug === "string" ? body.templateSlug.trim() : "";
  const template = await findActivatableBusinessTemplate(templateSlug);
  if (!template) {
    return NextResponse.json({ error: "Unknown or unavailable template" }, { status: 400 });
  }

  const now = new Date();
  const prevSlug = studio.businessTemplateSlug;
  const prevAt = studio.businessTemplateActivatedAt;

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.studio.update({
      where: { id: studioId },
      data: {
        businessTemplateSlug: templateSlug,
        businessTemplateActivatedAt: now,
      },
      select: {
        id: true,
        businessTemplateSlug: true,
        businessTemplateActivatedAt: true,
      },
    });

    await tx.businessTemplateActivationLog.create({
      data: {
        studioId,
        previousSlug: prevSlug,
        previousActivatedAt: prevAt,
        newSlug: templateSlug,
        newActivatedAt: now,
        previousSnapshot: snapshotFromStudio(prevSlug, prevAt),
        newSnapshot: snapshotFromStudio(templateSlug, now),
      },
    });

    await tx.businessTemplateFunnelEvent.create({
      data: {
        studioId,
        templateSlug,
        eventType: "activation_success",
        meta: { source: "vendor_post" },
      },
    });

    return u;
  });

  return NextResponse.json({ ok: true, studio: updated });
}
